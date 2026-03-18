import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

type DateRange = { from?: string; to?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDateRange(query: any, range: '7d' | '30d' | 'all' | 'custom', dateRange?: DateRange) {
    if (range === 'custom' && dateRange?.from) {
        query = query.gte('created_at', dateRange.from + 'T00:00:00')
        if (dateRange.to) {
            query = query.lte('created_at', dateRange.to + 'T23:59:59')
        }
    } else if (range !== 'all') {
        const days = range === '7d' ? 7 : 30
        const date = new Date()
        date.setDate(date.getDate() - days)
        const dateStr = date.toISOString().split('T')[0]
        query = query.gte('created_at', dateStr + 'T00:00:00')
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

        const filtered = (data || []).filter(o => o.status !== 'cancelled')
        const totalSales = filtered.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0)
        const totalOrders = filtered.length
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
    },

    getOrdersByDay: async (range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let query = supabase
            .from('orders')
            .select('created_at, total, status, order_number, customer_name, metadata')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(2000)
        query = applyDateRange(query, range, dateRange)

        const { data, error } = await query
        if (error) throw error
        return data || []
    },

    getMyCompanyOrders: async (companyFilter: string, range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let query = supabase
            .from('orders')
            .select('created_at, total, status, order_number, customer_name, customer_whatsapp, delivery_address, metadata')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(2000)
        query = applyDateRange(query, range, dateRange)

        const { data, error } = await query
        if (error) throw error

        // Filter client-side by company_name in metadata
        const filtered = (data || []).filter(
            (o: { metadata?: Record<string, unknown> }) =>
                (o.metadata?.company_name as string | undefined) === companyFilter
        )
        return filtered
    },

    getOrdersByCustomer: async (range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let query = supabase
            .from('orders')
            .select('created_at, total, status, order_number, customer_name, customer_whatsapp, delivery_address, metadata')
            .eq('store_id', storeId)
            .order('customer_name', { ascending: true })
            .limit(2000)
        query = applyDateRange(query, range, dateRange)

        const { data, error } = await query
        if (error) throw error
        return data || []
    },

    getOrdersByCompany: async (range: '7d' | '30d' | 'all' | 'custom' = 'all', dateRange?: DateRange) => {
        const storeId = await getStoreId()
        let ordersQuery = supabase
            .from('orders')
            .select('id, created_at, total, status, order_number, customer_name, customer_whatsapp, delivery_address, metadata')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(2000)
        ordersQuery = applyDateRange(ordersQuery, range, dateRange)

        const { data: orders, error: ordersError } = await ordersQuery
        if (ordersError) throw ordersError
        if (!orders || orders.length === 0) return []

        const orderIds = orders.map(o => o.id)
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('order_id, quantity, price, products(name)')
            .in('order_id', orderIds)

        if (itemsError) throw itemsError

        const itemsByOrder: Record<string, { quantity: number; price: number; products: { name: string } | null }[]> = {}
        ;(items || []).forEach((item: { order_id: string; quantity: number; price: number; products: { name: string } | { name: string }[] | null }) => {
            if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
            const prod = Array.isArray(item.products) ? item.products[0] : item.products
            itemsByOrder[item.order_id].push({ quantity: item.quantity, price: item.price, products: prod })
        })

        return orders.map(o => ({ ...o, items: itemsByOrder[o.id] || [] }))
    }
}
