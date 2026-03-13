import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

type DateRange = { from?: string; to?: string }

function applyDateRange(query: ReturnType<typeof supabase.from>, range: '7d' | '30d' | 'all' | 'custom', dateRange?: DateRange) {
    if (range === 'custom' && dateRange?.from) {
        query = query.gte('created_at', new Date(dateRange.from).toISOString())
        if (dateRange.to) {
            const toDate = new Date(dateRange.to)
            toDate.setHours(23, 59, 59, 999)
            query = query.lte('created_at', toDate.toISOString())
        }
    } else if (range !== 'all') {
        const days = range === '7d' ? 7 : 30
        const date = new Date()
        date.setDate(date.getDate() - days)
        query = query.gte('created_at', date.toISOString())
    }
    return query
}

export const statsApi = {
    getOverview: async (range: '7d' | '30d' | 'all' | 'custom' = '30d', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let query = supabase.from('orders').select('total, created_at, status').eq('store_id', storeId)
        query = applyDateRange(query, range, dateRange)

        const { data, error } = await query
        if (error) throw error

        const filtered = (data || []).filter(o => ['completed', 'paid', 'delivered', 'pending'].includes(o.status))
        const totalSales = filtered.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)
        const totalOrders = (data || []).length
        const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0

        return { totalSales, totalOrders, avgTicket, orders: data || [] }
    },

    getOrdersByZone: async (range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let query = supabase
            .from('orders')
            .select('delivery_address, total, status, created_at')
            .eq('store_id', storeId)
            .not('delivery_address', 'is', null)
        query = applyDateRange(query, range, dateRange)

        const { data, error } = await query
        if (error) throw error
        return data || []
    },

    getTopProducts: async (range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let ordersQuery = supabase
            .from('orders')
            .select('id')
            .eq('store_id', storeId)
        ordersQuery = applyDateRange(ordersQuery, range, dateRange)

        const { data: orders, error: ordersError } = await ordersQuery
        if (ordersError) throw ordersError

        const orderIds = (orders || []).map(o => o.id)
        if (orderIds.length === 0) return []

        const { data, error } = await supabase
            .from('order_items')
            .select('quantity, price, product_id, products(name)')
            .in('order_id', orderIds)

        if (error) throw error
        return data || []
    },

    getTopCustomers: async (range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let query = supabase
            .from('orders')
            .select('customer_name, customer_whatsapp, order_number, total, created_at')
            .eq('store_id', storeId)
        query = applyDateRange(query, range, dateRange)

        const { data, error } = await query
        if (error) throw error
        return data || []
    }
}
