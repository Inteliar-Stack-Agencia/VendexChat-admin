import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import { withTimeout } from '../utils/timeout'
import type { DashboardStats } from '../types'

const API_TIMEOUT = 10000

export const dashboardApi = {
    getStats: async (): Promise<DashboardStats> => {
        return withTimeout(_getStatsInternal(), API_TIMEOUT, 'dashboardApi.getStats')
    }
}

async function _getStatsInternal(): Promise<DashboardStats> {
    const storeId = await getStoreId()
    if (!storeId) return { orders_today: 0, sales_today: 0, active_products: 0, recent_orders: [], low_stock_products: [] }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Queries críticas: KPIs + Pedidos recientes (bloqueantes)
    const [
        ordersTodayResult,
        salesTodayResult,
        productsCountResult,
        recentOrdersResult,
    ] = await Promise.all([
        supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .gte('created_at', todayISO),
        supabase
            .from('orders')
            .select('total')
            .eq('store_id', storeId)
            .in('status', ['completed', 'paid', 'delivered', 'pending'])
            .gte('created_at', todayISO)
            .limit(500),
        supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .eq('is_active', true),
        supabase
            .from('orders')
            .select('id, total, status, customer_name, order_number, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(5),
    ])

    // Query no-crítica: stock bajo
    const lowStockResult = await supabase
        .from('products')
        .select('id, name, stock, image_url')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('unlimited_stock', false)
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(10)

    return {
        orders_today: ordersTodayResult.count || 0,
        sales_today: salesTodayResult.data?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0,
        active_products: productsCountResult.count || 0,
        recent_orders: recentOrdersResult.data || [],
        low_stock_products: lowStockResult.data || []
    }
}
