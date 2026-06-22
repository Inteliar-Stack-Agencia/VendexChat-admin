import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import { expensesApi } from './expensesApi'

export type MovementType = 'ingreso' | 'egreso'
export type EgressReason = 'merma' | 'consumo_interno' | 'devolucion' | 'otro'

export interface InventoryEntry {
  id: string
  store_id: string
  date: string
  product_line: string
  product_id: string | null
  quantity: number | null
  cost: number
  notes: string | null
  expense_id: string | null
  movement_type: MovementType
  created_at: string
}

export interface InventoryDayInput {
  product_line: string
  product_id?: string | null
  quantity?: number
  unit_cost?: number
  cost: number
  notes?: string
}

export interface InventoryEgressInput {
  product_line: string
  product_id?: string | null
  quantity?: number
  cost: number
  reason: EgressReason
  notes?: string
}

export const EGRESS_REASON_LABEL: Record<EgressReason, string> = {
  merma: 'Merma',
  consumo_interno: 'Consumo interno',
  devolucion: 'Devolución',
  otro: 'Otro',
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

  registerDayInputs: async (date: string, inputs: InventoryDayInput[]) => {
    const storeId = await getStoreId()
    const results: InventoryEntry[] = []

    for (const input of inputs) {
      if (!input.cost || input.cost <= 0) continue

      const expense = await expensesApi.createExpense({
        description: `Insumos ${input.product_line}`,
        category: 'materia_prima',
        expense_type: 'variable',
        amount: input.cost,
        date,
        supplier_id: null,
        notes: input.notes || null,
      })

      if (input.product_id && input.quantity && input.quantity > 0) {
        const { data: product } = await supabase
          .from('products')
          .select('stock, unlimited_stock')
          .eq('id', input.product_id)
          .single()

        if (product && !product.unlimited_stock) {
          await supabase
            .from('products')
            .update({ stock: (product.stock || 0) + input.quantity })
            .eq('id', input.product_id)
        }
      }

      const { data, error } = await supabase
        .from('inventory_entries')
        .insert({
          store_id: storeId,
          date,
          product_line: input.product_line,
          product_id: input.product_id || null,
          quantity: input.quantity || null,
          cost: input.cost,
          notes: input.notes || null,
          expense_id: expense.id,
          movement_type: 'ingreso',
        })
        .select()
        .single()

      if (error) throw error
      results.push(data as InventoryEntry)
    }

    return results
  },

  registerDayEgresses: async (date: string, egresses: InventoryEgressInput[]) => {
    const storeId = await getStoreId()
    const results: InventoryEntry[] = []

    for (const egress of egresses) {
      if (!egress.cost || egress.cost <= 0) continue

      const expenseCategory = egress.reason === 'merma' ? 'merma'
        : egress.reason === 'consumo_interno' ? 'consumo_interno'
        : 'otros'

      const expense = await expensesApi.createExpense({
        description: `${EGRESS_REASON_LABEL[egress.reason]} ${egress.product_line}`,
        category: expenseCategory as Parameters<typeof expensesApi.createExpense>[0]['category'],
        expense_type: 'variable',
        amount: egress.cost,
        date,
        supplier_id: null,
        notes: egress.notes || null,
      })

      // Subtract stock if linked to a product
      if (egress.product_id && egress.quantity && egress.quantity > 0) {
        const { data: product } = await supabase
          .from('products')
          .select('stock, unlimited_stock')
          .eq('id', egress.product_id)
          .single()

        if (product && !product.unlimited_stock) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, (product.stock || 0) - egress.quantity) })
            .eq('id', egress.product_id)
        }
      }

      const { data, error } = await supabase
        .from('inventory_entries')
        .insert({
          store_id: storeId,
          date,
          product_line: egress.product_line,
          product_id: egress.product_id || null,
          quantity: egress.quantity || null,
          cost: egress.cost,
          notes: egress.reason + (egress.notes ? ` · ${egress.notes}` : ''),
          expense_id: expense.id,
          movement_type: 'egreso',
        })
        .select()
        .single()

      if (error) throw error
      results.push(data as InventoryEntry)
    }

    return results
  },

  deleteEntry: async (
    id: string,
    expenseId: string | null,
    productId: string | null,
    quantity: number | null,
    movementType: MovementType = 'ingreso',
  ) => {
    if (productId && quantity && quantity > 0) {
      const { data: product } = await supabase
        .from('products')
        .select('stock, unlimited_stock')
        .eq('id', productId)
        .single()

      if (product && !product.unlimited_stock) {
        // Revert: ingreso → subtract, egreso → add back
        const newStock = movementType === 'egreso'
          ? (product.stock || 0) + quantity
          : Math.max(0, (product.stock || 0) - quantity)
        await supabase.from('products').update({ stock: newStock }).eq('id', productId)
      }
    }

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
        .select('product_line, cost, quantity, product_id, movement_type')
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

    const ingresos = (entriesRes.data || []).filter((e) => e.movement_type !== 'egreso')
    const egresos = (entriesRes.data || []).filter((e) => e.movement_type === 'egreso')

    const totalInputCost = ingresos.reduce((s, e) => s + Number(e.cost), 0)
    const totalEgressCost = egresos.reduce((s, e) => s + Number(e.cost), 0)
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
      totalEgressCost,
      totalRevenue,
      margin: totalRevenue - totalInputCost - totalEgressCost,
      orderCount: (ordersRes.data || []).length,
      byPayment,
      entries: entriesRes.data || [],
    }
  },
}
