import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const customersApi = {
    list: async (params?: { page?: number; limit?: number; search?: string; archived?: boolean }) => {
        const storeId = await getStoreId()
        const limit = params?.limit || 50
        const page = params?.page || 1

        let query = supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .eq('store_id', storeId)

        // Filter by archived status (default: show non-archived)
        if (params?.archived) {
            query = query.eq('is_archived', true)
        } else {
            query = query.or('is_archived.is.null,is_archived.eq.false')
        }

        if (params?.search) {
            query = query.or(`name.ilike.%${params.search}%,whatsapp.ilike.%${params.search}%`)
        }

        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data, error, count } = await query
            .range(from, to)
            .order('last_order_at', { ascending: false })

        if (error) throw error

        return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit)
        }
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

    archive: async (id: string, archived: boolean) => {
        const { data, error } = await supabase
            .from('customers')
            .update({ is_archived: archived })
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data
    },

    remove: async (id: string) => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
        if (error) throw error
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
