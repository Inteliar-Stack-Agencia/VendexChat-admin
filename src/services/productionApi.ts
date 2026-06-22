import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export interface ProductionEntry {
  id: string
  store_id: string
  date: string
  product_id: string
  quantity: number
  created_at: string
}

export interface ProductionWeekData {
  // production[product_id][date] = quantity
  production: Record<string, Record<string, number>>
  // sales[product_id][date] = { qty, revenue }
  sales: Record<string, Record<string, { qty: number; revenue: number }>>
}

export const productionApi = {
  getWeekData: async (weekStart: string, weekEnd: string): Promise<ProductionWeekData> => {
    const storeId = await getStoreId()

    // Run queries independently so one failure doesn't break the other
    const prodRes = await supabase
      .from('production_log')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', weekStart)
      .lte('date', weekEnd)

    if (prodRes.error) throw prodRes.error

    // Try to get sales from orders — fail silently if orders schema differs
    let salesData: Array<{ created_at: string; items: unknown; total: number }> = []
    try {
      const ordersRes = await supabase
        .from('orders')
        .select('created_at, items, total')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', `${weekStart}T00:00:00`)
        .lte('created_at', `${weekEnd}T23:59:59`)

      if (!ordersRes.error) {
        salesData = (ordersRes.data || []) as typeof salesData
      } else {
        console.warn('production: orders query failed silently', ordersRes.error.message)
      }
    } catch (e) {
      console.warn('production: orders fetch failed silently', e)
    }

    // Build production map
    const production: Record<string, Record<string, number>> = {}
    for (const entry of prodRes.data || []) {
      if (!production[entry.product_id]) production[entry.product_id] = {}
      production[entry.product_id][entry.date] = entry.quantity
    }

    // Build sales map from order items
    const sales: Record<string, Record<string, { qty: number; revenue: number }>> = {}
    for (const order of salesData) {
      const date = order.created_at.split('T')[0]
      const items = (order.items || []) as Array<{
        product_id: string
        quantity: number
        subtotal: number
      }>
      for (const item of items) {
        if (!item.product_id) continue
        if (!sales[item.product_id]) sales[item.product_id] = {}
        if (!sales[item.product_id][date]) sales[item.product_id][date] = { qty: 0, revenue: 0 }
        sales[item.product_id][date].qty += item.quantity
        sales[item.product_id][date].revenue += item.subtotal
      }
    }

    return { production, sales }
  },

  upsertEntry: async (date: string, productId: string, quantity: number) => {
    const storeId = await getStoreId()
    const { error } = await supabase
      .from('production_log')
      .upsert(
        { store_id: storeId, date, product_id: productId, quantity },
        { onConflict: 'store_id,date,product_id' },
      )
    if (error) throw error
  },

  deleteEntry: async (date: string, productId: string) => {
    const storeId = await getStoreId()
    const { error } = await supabase
      .from('production_log')
      .delete()
      .eq('store_id', storeId)
      .eq('date', date)
      .eq('product_id', productId)
    if (error) throw error
  },
}
