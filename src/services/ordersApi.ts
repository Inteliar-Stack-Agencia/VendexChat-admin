import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { Order, OrderStatus } from '../types'

export const ordersApi = {
    list: async (params?: { status?: string; page?: number; limit?: number }) => {
        const storeId = await getStoreId()

        let query = supabase.from('orders').select('*', { count: 'exact' }).eq('store_id', storeId)
        if (params?.status && params.status !== 'all') query = query.eq('status', params.status)

        if ((params as any)?.date_from) {
            query = query.gte('created_at', (params as any).date_from + 'T00:00:00')
        }
        if ((params as any)?.date_to) {
            query = query.lte('created_at', (params as any).date_to + 'T23:59:59')
        }

        const from = ((params?.page || 1) - 1) * (params?.limit || 10)
        const to = from + (params?.limit || 10) - 1

        const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
        if (error) throw error

        return {
            data: data as Order[],
            total: count || 0,
            page: params?.page || 1,
            limit: params?.limit || 10,
            total_pages: Math.ceil((count || 0) / (params?.limit || 10))
        }
    },

    get: async (id: string | number) => {
        const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single()
        if (error) throw error
        return data as Order
    },

    updateStatus: async (id: string | number, status: OrderStatus) => {
        const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single()
        if (error) throw error
        return data as Order
    },
}
