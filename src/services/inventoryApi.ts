import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import { expensesApi } from './expensesApi'

export interface InventoryEntry {
  id: string
  store_id: string
  date: string
  product_line: string
  quantity: number | null
  cost: number
  notes: string | null
  expense_id: string | null
  created_at: string
}

export interface InventoryDayInput {
  product_line: string
  quantity?: number
  cost: number
  notes?: string
}

export const inventoryApi = {
  listEntries: async (params?: { from?: string; to?: string }) => {
    const storeId = await getStoreId()
    let query = supabase
      .from('inventory_entries')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (params?.from) query = query.gte('date', params.from)
    if (params?.to) query = query.lte('date', params.to)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as InventoryEntry[]
  },

  // Register a day's inputs — each line auto-creates an expense
  registerDayInputs: async (date: string, inputs: InventoryDayInput[]) => {
    const storeId = await getStoreId()
    const results: InventoryEntry[] = []

    for (const input of inputs) {
      if (!input.cost || input.cost <= 0) continue

      // Auto-create expense
      const expense = await expensesApi.createExpense({
        description: `Insumos ${input.product_line}`,
        category: 'materia_prima',
        expense_type: 'variable',
        amount: input.cost,
        date,
        supplier_id: null,
        notes: input.notes || null,
      })

      const { data, error } = await supabase
        .from('inventory_entries')
        .insert({
          store_id: storeId,
          date,
          product_line: input.product_line,
          quantity: input.quantity || null,
          cost: input.cost,
          notes: input.notes || null,
          expense_id: expense.id,
        })
        .select()
        .single()

      if (error) throw error
      results.push(data as InventoryEntry)
    }

    return results
  },

  deleteEntry: async (id: string, expenseId: string | null) => {
    if (expenseId) {
      await supabase.from('expenses').delete().eq('id', expenseId)
    }
    const { error } = await supabase.from('inventory_entries').delete().eq('id', id)
    if (error) throw error
  },

  getDaySummary: async (date: string) => {
    const storeId = await getStoreId()

    const [entriesRes, ordersRes] = await Promise.all([
      supabase
        .from('inventory_entries')
        .select('product_line, cost, quantity')
        .eq('store_id', storeId)
        .eq('date', date),
      supabase
        .from('orders')
        .select('total, metadata')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`),
    ])

    if (entriesRes.error) throw entriesRes.error
    if (ordersRes.error) throw ordersRes.error

    const totalInputCost = (entriesRes.data || []).reduce((s, e) => s + Number(e.cost), 0)
    const totalRevenue = (ordersRes.data || []).reduce((s, o) => s + Number(o.total), 0)
    const byPayment = { efectivo: 0, mercadopago: 0, transferencia: 0, tarjeta: 0 }

    for (const o of ordersRes.data || []) {
      const pm = (o.metadata as Record<string, string>)?.payment_method || 'efectivo'
      const amt = Number(o.total)
      if (pm in byPayment) byPayment[pm as keyof typeof byPayment] += amt
      else byPayment.efectivo += amt
    }

    return {
      date,
      totalInputCost,
      totalRevenue,
      margin: totalRevenue - totalInputCost,
      orderCount: (ordersRes.data || []).length,
      byPayment,
      entries: entriesRes.data || [],
    }
  },
}
