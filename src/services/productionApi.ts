import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export interface ProductionEntry {
  id: string
  store_id: string
  date: string
  product_id: string
  quantity: number
  sobrante: number
  consumo_interno: number
  merma: number
  cost_price: number | null
  created_at: string
}

export interface ProductionWeekData {
  // production[product_id][date] = quantity produced
  production: Record<string, Record<string, number>>
  // stock[product_id][date] = { sobrante, consumo_interno, merma }
  stock: Record<string, Record<string, { sobrante: number; consumo_interno: number; merma: number }>>
  // sales[product_id][date] = { qty, revenue }
  sales: Record<string, Record<string, { qty: number; revenue: number }>>
  // costs[product_id] = cost_price for this week (from production_log)
  costs: Record<string, number | null>
}

export const productionApi = {
  getWeekData: async (weekStart: string, weekEnd: string): Promise<ProductionWeekData> => {
    const storeId = await getStoreId()

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
    const stock: Record<string, Record<string, { sobrante: number; consumo_interno: number; merma: number }>> = {}
    const costs: Record<string, number | null> = {}

    for (const entry of (prodRes.data || []) as ProductionEntry[]) {
      if (!production[entry.product_id]) production[entry.product_id] = {}
      production[entry.product_id][entry.date] = entry.quantity || 0

      if (!stock[entry.product_id]) stock[entry.product_id] = {}
      stock[entry.product_id][entry.date] = {
        sobrante: entry.sobrante || 0,
        consumo_interno: entry.consumo_interno || 0,
        merma: entry.merma || 0,
      }

      // Take first non-null cost_price found for this product in the week
      if (!(entry.product_id in costs) && entry.cost_price != null) {
        costs[entry.product_id] = entry.cost_price
      } else if (!(entry.product_id in costs)) {
        costs[entry.product_id] = null
      }
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

    return { production, stock, sales, costs }
  },

  // Save all production quantities for a week at once (used by edit mode)
  saveWeekEntries: async (
    weekDates: string[],
    entries: Record<string, Record<string, number>>, // entries[productId][date] = qty
    costs: Record<string, number | null>, // costs[productId] = cost for this week
    storeId: string,
  ) => {
    const rows: Array<{
      store_id: string
      date: string
      product_id: string
      quantity: number
      cost_price: number | null
    }> = []

    for (const [productId, datemap] of Object.entries(entries)) {
      const cost = costs[productId] ?? null
      for (const date of weekDates) {
        const qty = datemap[date] ?? 0
        if (qty > 0 || cost != null) {
          rows.push({ store_id: storeId, date, product_id: productId, quantity: qty, cost_price: cost })
        }
      }
    }

    if (rows.length === 0) return

    const { error } = await supabase
      .from('production_log')
      .upsert(rows, { onConflict: 'store_id,date,product_id' })
    if (error) throw error
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

  upsertStockClose: async (
    date: string,
    productId: string,
    fields: { sobrante?: number; consumo_interno?: number; merma?: number },
  ) => {
    const storeId = await getStoreId()
    const { error } = await supabase
      .from('production_log')
      .upsert(
        { store_id: storeId, date, product_id: productId, quantity: 0, ...fields },
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
