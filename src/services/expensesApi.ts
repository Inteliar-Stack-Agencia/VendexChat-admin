import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export type ExpenseCategory =
  | 'materia_prima'
  | 'servicios'
  | 'alquiler'
  | 'personal'
  | 'transporte'
  | 'marketing'
  | 'otros'

export interface Supplier {
  id: string
  store_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  category: string | null
  notes: string | null
  created_at: string
}

export type ExpenseType = 'fijo' | 'variable'

export interface Expense {
  id: string
  store_id: string
  supplier_id: string | null
  supplier?: Supplier | null
  description: string
  category: ExpenseCategory
  expense_type: ExpenseType
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export const expensesApi = {
  // Gastos
  listExpenses: async (params?: { from?: string; to?: string; category?: ExpenseCategory }) => {
    const storeId = await getStoreId()
    let query = supabase
      .from('expenses')
      .select('*, supplier:suppliers(id, name)')
      .eq('store_id', storeId)
      .order('date', { ascending: false })

    if (params?.from) query = query.gte('date', params.from)
    if (params?.to) query = query.lte('date', params.to)
    if (params?.category) query = query.eq('category', params.category)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Expense[]
  },

  // Ingresos mensuales desde orders (para P&L)
  getMonthlyRevenue: async (year: number) => {
    const storeId = await getStoreId()
    const from = `${year}-01-01T00:00:00`
    const to = `${year}-12-31T23:59:59`
    const { data, error } = await supabase
      .from('orders')
      .select('total, created_at, status')
      .eq('store_id', storeId)
      .gte('created_at', from)
      .lte('created_at', to)
    if (error) throw error
    return (data || []).filter((o) => o.status !== 'cancelled') as { total: number; created_at: string }[]
  },

  createExpense: async (expense: Omit<Expense, 'id' | 'store_id' | 'created_at' | 'supplier'>) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data as Expense
  },

  deleteExpense: async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },

  // Proveedores
  listSuppliers: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true })
    if (error) throw error
    return (data || []) as Supplier[]
  },

  createSupplier: async (supplier: Omit<Supplier, 'id' | 'store_id' | 'created_at'>) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...supplier, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  updateSupplier: async (id: string, updates: Partial<Omit<Supplier, 'id' | 'store_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  deleteSupplier: async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) throw error
  },
}
