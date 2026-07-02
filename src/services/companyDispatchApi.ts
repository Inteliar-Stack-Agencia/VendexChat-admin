import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export interface CompanyClient {
  id: string
  store_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  prices?: CompanyClientPrice[]
}

export interface CompanyClientPrice {
  id: string
  client_id: string
  category_id: string
  price: number
}

export interface CompanyDispatch {
  id: string
  store_id: string
  client_id: string
  date: string
  employee_name: string | null
  notes: string | null
  total: number
  created_at: string
  client?: { name: string }
  items?: CompanyDispatchItem[]
}

export interface CompanyDispatchItem {
  id: string
  dispatch_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export const companyDispatchApi = {
  // ── Clients ──────────────────────────────────────────────────────────────────

  listClients: async (): Promise<CompanyClient[]> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('company_clients')
      .select('*, prices:company_client_prices(*)')
      .eq('store_id', storeId)
      .order('name')
    if (error) throw error
    return data || []
  },

  createClient: async (client: {
    name: string
    contact_name?: string
    phone?: string
    email?: string
    notes?: string
  }): Promise<CompanyClient> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('company_clients')
      .insert({ ...client, store_id: storeId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  updateClient: async (id: string, patch: Partial<CompanyClient>): Promise<CompanyClient> => {
    const { data, error } = await supabase
      .from('company_clients')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  deleteClient: async (id: string) => {
    const { error } = await supabase.from('company_clients').delete().eq('id', id)
    if (error) throw error
  },

  // Save all prices for a client (by category)
  saveClientPrices: async (clientId: string, prices: { category_id: string; price: number }[]) => {
    await supabase.from('company_client_prices').delete().eq('client_id', clientId)
    if (prices.length === 0) return
    const { error } = await supabase
      .from('company_client_prices')
      .insert(prices.map(p => ({ client_id: clientId, category_id: p.category_id, price: p.price })))
    if (error) throw error
  },

  // ── Dispatches ───────────────────────────────────────────────────────────────

  listDispatches: async (params?: { from?: string; to?: string; client_id?: string }): Promise<CompanyDispatch[]> => {
    const storeId = await getStoreId()
    let query = supabase
      .from('company_dispatches')
      .select('*, client:company_clients(name), items:company_dispatch_items(*)')
      .eq('store_id', storeId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (params?.from) query = query.gte('date', params.from)
    if (params?.to) query = query.lte('date', params.to)
    if (params?.client_id) query = query.eq('client_id', params.client_id)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  createDispatch: async (dispatch: {
    client_id: string
    date: string
    employee_name?: string
    notes?: string
    items: { product_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number }[]
  }): Promise<CompanyDispatch> => {
    const storeId = await getStoreId()
    const total = dispatch.items.reduce((s, i) => s + i.subtotal, 0)

    const { data, error } = await supabase
      .from('company_dispatches')
      .insert({ store_id: storeId, client_id: dispatch.client_id, date: dispatch.date, employee_name: dispatch.employee_name || null, notes: dispatch.notes || null, total })
      .select()
      .single()
    if (error) throw error

    if (dispatch.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('company_dispatch_items')
        .insert(dispatch.items.map(i => ({ dispatch_id: data.id, ...i })))
      if (itemsError) throw itemsError
    }

    return data
  },

  updateDispatch: async (id: string, patch: { date?: string; employee_name?: string | null; notes?: string | null; items: { product_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number }[] }): Promise<CompanyDispatch> => {
    const total = patch.items.reduce((s, i) => s + i.subtotal, 0)
    const { data, error } = await supabase
      .from('company_dispatches')
      .update({ date: patch.date, employee_name: patch.employee_name ?? null, notes: patch.notes ?? null, total })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await supabase.from('company_dispatch_items').delete().eq('dispatch_id', id)
    if (patch.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('company_dispatch_items')
        .insert(patch.items.map(i => ({ dispatch_id: id, ...i })))
      if (itemsError) throw itemsError
    }
    return data
  },

  deleteDispatch: async (id: string) => {
    await supabase.from('company_dispatch_items').delete().eq('dispatch_id', id)
    const { error } = await supabase.from('company_dispatches').delete().eq('id', id)
    if (error) throw error
  },

  // Weekly summary grouped by client
  weeklySummary: async (from: string, to: string) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('company_dispatches')
      .select('*, client:company_clients(name), items:company_dispatch_items(*)')
      .eq('store_id', storeId)
      .gte('date', from)
      .lte('date', to)
      .order('date')
    if (error) throw error
    return data || []
  },
}
