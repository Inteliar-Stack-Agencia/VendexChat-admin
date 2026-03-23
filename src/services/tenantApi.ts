import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import { withTimeout } from '../utils/timeout'
import type { Tenant } from '../types'

const API_TIMEOUT = 10000

export const tenantApi = {
    getMe: async () => {
        return withTimeout(_getMeInternal(), API_TIMEOUT, 'tenantApi.getMe')
    },

    updateMe: async (data: Partial<Tenant>) => {
        return withTimeout(_updateMeInternal(data), API_TIMEOUT, 'tenantApi.updateMe')
    },

    listGateways: async () => {
        const { data: profile } = await supabase.from('profiles').select('store_id').single();
        if (!profile?.store_id) return [];

        const { data, error } = await supabase
            .from('gateways')
            .select('*')
            .eq('store_id', profile.store_id)
            .eq('is_master', false)

        if (error) throw error
        return data
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectGateway: async (provider: string, config: any) => {
        const { data: profile } = await supabase.from('profiles').select('store_id').single();
        if (!profile?.store_id) throw new Error('No store associated with this user');

        const { data, error } = await supabase
            .from('gateways')
            .upsert({
                store_id: profile.store_id,
                provider,
                config,
                is_master: false
            }, { onConflict: 'store_id,provider,is_master' })
            .select()
            .single()

        if (error) throw error
        return data
    },
}

async function _getMeInternal(): Promise<Tenant> {
    const storeId = await getStoreId()
    const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()

    if (!store) throw new Error('No store found for this user')
    return store as unknown as Tenant
}

async function _updateMeInternal(data: Partial<Tenant>): Promise<Tenant> {
    const storeId = await getStoreId()

    const { data: updated, error } = await supabase
        .from('stores')
        .update(data)
        .eq('id', storeId)
        .select()
        .single()

    if (!error && updated) return updated as unknown as Tenant

    console.warn('[tenantApi.updateMe] Direct update failed, trying RPC fallback:', error?.message)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_my_store', {
        p_store_id: storeId,
        p_data: data
    })

    if (rpcError) throw rpcError
    return rpcResult as unknown as Tenant
}
