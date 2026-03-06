import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { DashboardStats } from '../types'

export const dashboardApi = {
    getStats: async (): Promise<DashboardStats> => {
        const storeId = await getStoreId()
        if (!storeId) return { orders_today: 0, sales_today: 0, active_products: 0, recent_orders: [], low_stock_products: [] }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [
            ordersTodayResult,
            salesTodayResult,
            productsCountResult,
            recentOrdersResult,
            lowStockResult
        ] = await Promise.all([
            supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .gte('created_at', today.toISOString()),
            supabase
                .from('orders')
                .select('total')
                .eq('store_id', storeId)
                .in('status', ['completed', 'paid', 'delivered'])
                .gte('created_at', today.toISOString()),
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
            supabase
                .from('products')
                .select('id, name, stock, image_url')
                .eq('store_id', storeId)
                .eq('is_active', true)
                .eq('unlimited_stock', false)
                .lte('stock', 5)
                .order('stock', { ascending: true })
                .limit(20)
        ])

        return {
            orders_today: ordersTodayResult.count || 0,
            sales_today: salesTodayResult.data?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0,
            active_products: productsCountResult.count || 0,
            recent_orders: recentOrdersResult.data || [],
            low_stock_products: lowStockResult.data || []
        }
    }
}
