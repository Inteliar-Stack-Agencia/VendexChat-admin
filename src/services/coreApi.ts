import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'

// Cache volátil en memoria para evitar llamadas redundantes de getUser en la misma sesión
let _cachedUser: User | null = null
let _lastSyncedStoreId: string | null = null

export const getStoreId = async (): Promise<string> => {
    // 1. Prioridad Absoluta: Selección Manual o Suplantación (Local Storage es Síncrono y Rápido)
    const impersonatedId = localStorage.getItem('vendexchat_impersonated_store')
    const selectedStoreId = localStorage.getItem('vendexchat_selected_store')
    const activeStoreId = impersonatedId || selectedStoreId

    // Si tenemos un store_id activo y ya lo sincronizamos este ciclo, devolverlo de inmediato
    if (activeStoreId && _lastSyncedStoreId === activeStoreId) {
        return activeStoreId
    }

    // 2. Obtener usuario de Auth (Con caché en memoria para esta ráfaga de peticiones)
    if (!_cachedUser) {
        const { data: { user } } = await supabase.auth.getUser()
        _cachedUser = user
    }

    const user = _cachedUser
    if (!user) throw new Error('No hay sesión activa')

    if (activeStoreId) {
        // SYNC: Mantener profiles.store_id en sync con localStorage — fire-and-forget (no-bloqueante)
        supabase.from('profiles').update({ store_id: activeStoreId }).eq('id', user.id)
            .then(() => { _lastSyncedStoreId = activeStoreId }, (e) => console.warn('[getStoreId] Profile sync failed (non-blocking):', e))
        _lastSyncedStoreId = activeStoreId
        return activeStoreId
    }

    // 3. Fallback: Obtener de perfiles (Si no hay en local storage)
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
    if (profile?.store_id) {
        _lastSyncedStoreId = profile.store_id
        return profile.store_id
    }

    // 4. Auto-reparación por slug en metadata
    const metaSlug = user.user_metadata?.slug
    if (metaSlug) {
        const { data: store } = await supabase.from('stores').select('id').eq('slug', metaSlug).single()
        if (store) {
            _lastSyncedStoreId = store.id
            supabase.from('profiles').update({ store_id: store.id }).eq('id', user.id)
                .then(() => { }, (e) => console.warn('[getStoreId] Profile update failed (non-blocking):', e))
            return store.id
        }
    }

    // 5. Último intento via owner_id
    const { data: anyStore } = await supabase.from('stores').select('id').eq('owner_id', user.id).limit(1).single()
    if (anyStore) {
        _lastSyncedStoreId = anyStore.id
        return anyStore.id
    }

    throw new Error(`No se pudo identificar la tienda.`)
}
