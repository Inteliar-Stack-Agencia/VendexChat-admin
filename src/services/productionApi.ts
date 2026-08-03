import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export type ManualSaleChannel = 'efectivo' | 'transferencia' | 'qr' | 'tarjeta'

export interface ManualStockSale {
  id: string
  store_id: string
  product_id: string
  week_start: string
  quantity: number
  channel: ManualSaleChannel
  amount: number
  notes: string | null
  created_at: string
}

export interface ProductionEntry {
  id: string
  store_id: string
  date: string
  product_id: string
  quantity: number
  sobrante: number
  consumo_interno: number
  merma: number
  reingreso: number
  cost_price: number | null
  created_at: string
}

export interface ProductionWeekData {
  // production[product_id][date] = quantity produced
  production: Record<string, Record<string, number>>
  // stock[product_id][date] = { sobrante, consumo_interno, merma }
  stock: Record<string, Record<string, { sobrante: number; consumo_interno: number; merma: number }>>
  // sales[product_id][date] = { qty, revenue, cobrado } — revenue = facturado, cobrado = plata realmente cobrada
  sales: Record<string, Record<string, { qty: number; revenue: number; cobrado: number }>>
  // costs[product_id] = cost_price for this week (from production_log)
  costs: Record<string, number | null>
  // reingresos[product_id][date] = sobrante de la semana anterior reingresado a la venta
  reingresos: Record<string, Record<string, number>>
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

    // Ventas directas (no facturadas a empresas) — se excluyen las que tienen invoice_id
    // porque esas se cobran vía company_invoices y se reconcilian por separado (dispatches).
    type OrderRow = {
      created_at: string
      status: string
      payment_status: string | null
      paid_amount: number | null
      order_items: { product_id: string | null; quantity: number; unit_price: number; subtotal: number | null }[]
    }
    let salesData: OrderRow[] = []
    try {
      const ordersRes = await supabase
        .from('orders')
        .select('created_at, status, payment_status, paid_amount, order_items(product_id, quantity, unit_price, subtotal)')
        .eq('store_id', storeId)
        .is('invoice_id', null)
        .neq('status', 'cancelled')
        .gte('created_at', `${weekStart}T00:00:00`)
        .lte('created_at', `${weekEnd}T23:59:59`)

      if (!ordersRes.error) {
        salesData = (ordersRes.data || []) as unknown as OrderRow[]
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
    const reingresos: Record<string, Record<string, number>> = {}

    for (const entry of (prodRes.data || []) as ProductionEntry[]) {
      if (!production[entry.product_id]) production[entry.product_id] = {}
      production[entry.product_id][entry.date] = entry.quantity || 0

      if (!stock[entry.product_id]) stock[entry.product_id] = {}
      stock[entry.product_id][entry.date] = {
        sobrante: entry.sobrante || 0,
        consumo_interno: entry.consumo_interno || 0,
        merma: entry.merma || 0,
      }

      if (!reingresos[entry.product_id]) reingresos[entry.product_id] = {}
      reingresos[entry.product_id][entry.date] = entry.reingreso || 0

      // Take first non-null cost_price found for this product in the week
      if (!(entry.product_id in costs) && entry.cost_price != null) {
        costs[entry.product_id] = entry.cost_price
      } else if (!(entry.product_id in costs)) {
        costs[entry.product_id] = null
      }
    }

    // Build sales map from order items. Un pedido "pending" todavía no se confirmó/entregó,
    // así que no salió de stock — no cuenta como vendido. El monto cobrado se prorratea por
    // el paid_amount real cuando está marcado paid/partial; si no está cobrado, es 0 (antes
    // se asumía cobrado de inmediato, que era válido solo cuando no existía el tracking de
    // payment_status por pedido — ahora todo pedido nuevo arranca en "pending" sin cobrar).
    const sales: Record<string, Record<string, { qty: number; revenue: number; cobrado: number }>> = {}
    for (const order of salesData) {
      if (order.status === 'pending') continue
      const date = order.created_at.split('T')[0]
      const items = order.order_items || []
      const itemsTotal = items.reduce((s, it) => s + Number(it.subtotal ?? it.quantity * it.unit_price), 0)
      const usesPaidAmount = (order.payment_status === 'paid' || order.payment_status === 'partial') && order.paid_amount != null
      const collectedRatio = usesPaidAmount && itemsTotal > 0 ? Number(order.paid_amount) / itemsTotal : 0
      for (const item of items) {
        if (!item.product_id) continue
        const subtotal = Number(item.subtotal ?? item.quantity * item.unit_price)
        if (!sales[item.product_id]) sales[item.product_id] = {}
        if (!sales[item.product_id][date]) sales[item.product_id][date] = { qty: 0, revenue: 0, cobrado: 0 }
        sales[item.product_id][date].qty += item.quantity
        sales[item.product_id][date].revenue += subtotal
        sales[item.product_id][date].cobrado += subtotal * collectedRatio
      }
    }

    return { production, stock, sales, costs, reingresos }
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

  // Cuánto se cobró en la semana (ventas directas, sin empresas) agrupado por medio de pago
  getWeekPaymentBreakdown: async (weekStart: string, weekEnd: string): Promise<Record<string, number>> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('orders')
      .select('total, paid_amount, metadata')
      .eq('store_id', storeId)
      .is('invoice_id', null)
      .in('payment_status', ['paid', 'partial'])
      .gte('created_at', `${weekStart}T00:00:00`)
      .lte('created_at', `${weekEnd}T23:59:59`)
    if (error) throw error

    const totals: Record<string, number> = { efectivo: 0, qr: 0, transferencia: 0, tarjeta: 0, other: 0 }
    for (const order of (data || [])) {
      const pm = ((order.metadata as Record<string, unknown> | null)?.payment_method as string) || 'other'
      const bucket = pm === 'mercadopago' ? 'qr' : (pm in totals ? pm : 'other')
      const cobrado = order.paid_amount != null ? Number(order.paid_amount) : Number(order.total)
      totals[bucket] += cobrado
    }
    return totals
  },

  // Ventas de mostrador que bajaron el stock pero nunca se cargaron como Pedido —
  // ajuste manual para conciliar esa plata contra "Diferencia sin explicar".
  listManualSales: async (weekStart: string): Promise<ManualStockSale[]> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('manual_stock_sales')
      .select('*')
      .eq('store_id', storeId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  createManualSale: async (input: {
    product_id: string
    week_start: string
    quantity: number
    channel: ManualSaleChannel
    amount: number
    notes?: string | null
  }): Promise<void> => {
    const storeId = await getStoreId()
    const { error } = await supabase
      .from('manual_stock_sales')
      .insert({ store_id: storeId, ...input, notes: input.notes || null })
    if (error) throw error
  },

  deleteManualSale: async (id: string): Promise<void> => {
    const storeId = await getStoreId()
    const { error } = await supabase
      .from('manual_stock_sales')
      .delete()
      .eq('store_id', storeId)
      .eq('id', id)
    if (error) throw error
  },

  // Conteo rápido diario de stock — cuántas unidades quedan de cada producto hoy.
  // Con el conteo de ayer y lo producido hoy se puede estimar cuánto se vendió
  // sin esperar al Cierre de Stock semanal completo.
  getDailyStockCount: async (date: string): Promise<Record<string, number>> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('daily_stock_counts')
      .select('product_id, quantity')
      .eq('store_id', storeId)
      .eq('date', date)
    if (error) throw error
    const map: Record<string, number> = {}
    for (const row of data || []) map[row.product_id] = row.quantity
    return map
  },

  saveDailyStockCount: async (date: string, counts: Record<string, number>): Promise<void> => {
    const storeId = await getStoreId()
    const rows = Object.entries(counts).map(([product_id, quantity]) => ({
      store_id: storeId, product_id, date, quantity,
    }))
    if (rows.length === 0) return
    const { error } = await supabase
      .from('daily_stock_counts')
      .upsert(rows, { onConflict: 'store_id,product_id,date' })
    if (error) throw error
  },

  // Plata vendida por producto, cargada a mano (reemplaza el intento de derivarla de Pedidos).
  getWeekSalesAmounts: async (weekStart: string, weekEnd: string): Promise<Record<string, Record<string, number>>> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('sales_log')
      .select('product_id, date, amount')
      .eq('store_id', storeId)
      .gte('date', weekStart)
      .lte('date', weekEnd)
    if (error) throw error
    const map: Record<string, Record<string, number>> = {}
    for (const row of data || []) {
      if (!map[row.product_id]) map[row.product_id] = {}
      map[row.product_id][row.date] = Number(row.amount)
    }
    return map
  },

  saveWeekSalesAmounts: async (weekDates: string[], entries: Record<string, Record<string, number>>): Promise<void> => {
    const storeId = await getStoreId()
    const rows: { store_id: string; date: string; product_id: string; amount: number }[] = []
    for (const [productId, datemap] of Object.entries(entries)) {
      for (const date of weekDates) {
        rows.push({ store_id: storeId, date, product_id: productId, amount: datemap[date] ?? 0 })
      }
    }
    if (rows.length === 0) return
    const { error } = await supabase
      .from('sales_log')
      .upsert(rows, { onConflict: 'store_id,date,product_id' })
    if (error) throw error
  },

  // Cantidad producida por producto en un día puntual (para generar etiquetas)
  getDayEntries: async (date: string): Promise<{ product_id: string; quantity: number }[]> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('production_log')
      .select('product_id, quantity')
      .eq('store_id', storeId)
      .eq('date', date)
      .gt('quantity', 0)
    if (error) throw error
    return data || []
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

  // Reingreso de sobrante de la semana anterior — se lee la fila existente primero para no
  // pisar quantity/sobrante/consumo/merma ya cargados ese día (a diferencia de
  // upsertStockClose, que sobreescribe quantity a 0 siempre).
  upsertReingreso: async (date: string, productId: string, reingreso: number): Promise<void> => {
    const storeId = await getStoreId()
    const { data: existing } = await supabase
      .from('production_log')
      .select('quantity, sobrante, consumo_interno, merma, cost_price')
      .eq('store_id', storeId).eq('date', date).eq('product_id', productId)
      .maybeSingle()
    const { error } = await supabase
      .from('production_log')
      .upsert(
        {
          store_id: storeId, date, product_id: productId, reingreso,
          quantity: existing?.quantity ?? 0,
          sobrante: existing?.sobrante ?? 0,
          consumo_interno: existing?.consumo_interno ?? 0,
          merma: existing?.merma ?? 0,
          cost_price: existing?.cost_price ?? null,
        },
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
