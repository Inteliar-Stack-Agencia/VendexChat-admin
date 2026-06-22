import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export type ExpenseCategory =
  | 'materia_prima'
  | 'servicios'
  | 'alquiler'
  | 'personal'
  | 'transporte'
  | 'marketing'
  | 'merma'
  | 'consumo_interno'
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

export interface Partner {
  id: string
  store_id: string
  name: string
  percentage: number
  created_at: string
}

export const expensesApi = {
  // Gastos — fijos siempre incluidos, variables filtrados por fecha
  listExpenses: async (params?: { from?: string; to?: string; category?: ExpenseCategory }) => {
    const storeId = await getStoreId()

    const baseSelect = '*, supplier:suppliers(id, name)'

    // Fixed expenses: always included (they recur every month)
    let fixedQuery = supabase
      .from('expenses')
      .select(baseSelect)
      .eq('store_id', storeId)
      .eq('expense_type', 'fijo')
    if (params?.category) fixedQuery = fixedQuery.eq('category', params.category)

    // Variable expenses: filtered by date range
    let varQuery = supabase
      .from('expenses')
      .select(baseSelect)
      .eq('store_id', storeId)
      .eq('expense_type', 'variable')
    if (params?.from) varQuery = varQuery.gte('date', params.from)
    if (params?.to) varQuery = varQuery.lte('date', params.to)
    if (params?.category) varQuery = varQuery.eq('category', params.category)

    const [fixedRes, varRes] = await Promise.all([fixedQuery, varQuery])
    if (fixedRes.error) throw fixedRes.error
    if (varRes.error) throw varRes.error

    const combined = [...(fixedRes.data || []), ...(varRes.data || [])]
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return combined as Expense[]
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

  // Socios
  listPartners: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('store_id', storeId)
      .order('percentage', { ascending: false })
    if (error) throw error
    return (data || []) as Partner[]
  },

  createPartner: async (partner: Omit<Partner, 'id' | 'store_id' | 'created_at'>) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('partners')
      .insert({ ...partner, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data as Partner
  },

  updatePartner: async (id: string, updates: Partial<Omit<Partner, 'id' | 'store_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Partner
  },

  deletePartner: async (id: string) => {
    const { error } = await supabase.from('partners').delete().eq('id', id)
    if (error) throw error
  },
}
