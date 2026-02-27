import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const statsApi = {
    getOverview: async (range: '7d' | '30d' | 'all' = '30d') => {
        const storeId = await getStoreId()
        const query = supabase.from('orders').select('total, created_at, status').eq('store_id', storeId)

        if (range !== 'all') {
            const days = range === '7d' ? 7 : 30
            const date = new Date()
            date.setDate(date.getDate() - days)
            query.gte('created_at', date.toISOString())
        }

        const { data, error } = await query
        if (error) throw error

        const totalSales = (data || [])
            .filter(o => ['completed', 'paid', 'delivered', 'pending'].includes(o.status))
            .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)

        const totalOrders = (data || []).length
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0

        return { totalSales, totalOrders, avgTicket, orders: data || [] }
    },

    getOrdersByZone: async () => {
        const storeId = await getStoreId()
        const { data, error } = await supabase
            .from('orders')
            .select('delivery_address, total, status, created_at')
            .eq('store_id', storeId)
            .not('delivery_address', 'is', null)

        if (error) throw error
        return data || []
    },

    getTopProducts: async () => {
        const storeId = await getStoreId()
        const { data, error } = await supabase
            .from('order_items')
            .select('quantity, price, product_id, products(name), orders!inner(store_id, status)')
            .eq('orders.store_id', storeId)

        if (error) throw error
        return data || []
    },

    getTopCustomers: async () => {
        const storeId = await getStoreId()
        const { data, error } = await supabase
            .from('orders')
            .select('customer_name, customer_whatsapp, order_number, total, created_at')
            .eq('store_id', storeId)

        if (error) throw error
        return data || []
    }
}
