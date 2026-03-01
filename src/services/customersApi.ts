import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const customersApi = {
    list: async () => {
        const storeId = await getStoreId()

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', storeId)
            .order('last_order_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    get: async (id: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single()
        if (error) throw error
        return data
    },

    updateNotes: async (id: string, notes: string) => {
        const { data, error } = await supabase
            .from('customers')
            .update({ notes })
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data
    },

    getOrdersByWhatsapp: async (whatsapp: string) => {
        const storeId = await getStoreId()
        const clean = whatsapp.replace(/\D/g, '')
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, total, status, created_at')
            .eq('store_id', storeId)
            .ilike('customer_whatsapp', `%${clean}%`)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
    }
}
