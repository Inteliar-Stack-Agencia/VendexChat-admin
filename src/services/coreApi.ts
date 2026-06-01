import { supabase } from '../supabaseClient'
import { withTimeout } from '../utils/timeout'
import type { User } from '@supabase/supabase-js'

// Cache volátil en memoria para evitar llamadas redundantes de getUser en la misma sesión
let _cachedUser: User | null = null
let _lastSyncedStoreId: string | null = null

// Timeout for the entire getStoreId resolution (covers all fallback steps)
const GET_STORE_TIMEOUT = 8000

export const getStoreId = async (): Promise<string> => {
    return withTimeout(_getStoreIdInternal(), GET_STORE_TIMEOUT, 'getStoreId')
}

// Reset cached user when auth state changes (e.g., sign-out)
export const resetCoreCache = () => {
    _cachedUser = null
    _lastSyncedStoreId = null
}

async function _getStoreIdInternal(): Promise<string> {
    const impersonatedId = localStorage.getItem('vendexchat_impersonated_store')
    const selectedStoreId = localStorage.getItem('vendexchat_selected_store')

    // 1. Impersonación de superadmin: confiar sin validar
    if (impersonatedId && _lastSyncedStoreId === impersonatedId) return impersonatedId

    // 2. Obtener usuario de Auth (con caché en memoria)
    // Usar getSession (lee de localStorage, sin red) para evitar race conditions en page reload
    if (!_cachedUser) {
        const { data: { session } } = await supabase.auth.getSession()
        _cachedUser = session?.user ?? null
    }

    const user = _cachedUser
    if (!user) throw new Error('No hay sesión activa')

    if (impersonatedId) {
        supabase.from('profiles').update({ store_id: impersonatedId }).eq('id', user.id)
            .then(() => { _lastSyncedStoreId = impersonatedId }, (e) => console.warn('[getStoreId] Profile sync failed:', e))
        _lastSyncedStoreId = impersonatedId
        return impersonatedId
    }

    // 3. selectedStoreId: verificar que el store existe y es accesible (sin filtrar por owner_id,
    // ya que en multi-sucursal un mismo usuario puede acceder stores de distinto owner via email compartido)
    if (selectedStoreId) {
        if (_lastSyncedStoreId === selectedStoreId) return selectedStoreId
        const { data: accessibleStore } = await supabase.from('stores').select('id').eq('id', selectedStoreId).maybeSingle()
        if (accessibleStore) {
            supabase.from('profiles').update({ store_id: selectedStoreId }).eq('id', user.id)
                .then(() => { _lastSyncedStoreId = selectedStoreId }, (e) => console.warn('[getStoreId] Profile sync failed:', e))
            _lastSyncedStoreId = selectedStoreId
            return selectedStoreId
        }
        // Store no encontrado (eliminado o sin acceso): limpiar y caer al fallback
        localStorage.removeItem('vendexchat_selected_store')
        _lastSyncedStoreId = null
    }

    // 3. Fallback: Obtener de perfiles (Si no hay en local storage)
    // Si ya sincronizamos el store_id en esta sesión (sin localStorage), devolverlo de inmediato
    if (_lastSyncedStoreId) return _lastSyncedStoreId

    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
    if (profile?.store_id) {
        _lastSyncedStoreId = profile.store_id
        localStorage.setItem('vendexchat_selected_store', profile.store_id)
        return profile.store_id
    }

    // 4. Auto-reparación por slug en metadata
    const metaSlug = user.user_metadata?.slug
    if (metaSlug) {
        const { data: store } = await supabase.from('stores').select('id').eq('slug', metaSlug).single()
        if (store) {
            _lastSyncedStoreId = store.id
            localStorage.setItem('vendexchat_selected_store', store.id)
            supabase.from('profiles').update({ store_id: store.id }).eq('id', user.id)
                .then(() => { }, (e) => console.warn('[getStoreId] Profile update failed (non-blocking):', e))
            return store.id
        }
    }

    // 5. Último intento via owner_id
    const { data: anyStore } = await supabase.from('stores').select('id').eq('owner_id', user.id).limit(1).single()
    if (anyStore) {
        _lastSyncedStoreId = anyStore.id
        localStorage.setItem('vendexchat_selected_store', anyStore.id)
        return anyStore.id
    }

    throw new Error(`No se pudo identificar la tienda.`)
}
