import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export type PriceMode = 'iva_incluido' | 'mas_iva'

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
  price_mode: PriceMode
  iva_rate: number
  prices?: CompanyClientPrice[]
}

export interface CompanyInvoice {
  id: string
  store_id: string
  client_id: string
  period_from: string
  period_to: string
  subtotal: number
  iva_amount: number
  total: number
  status: 'facturado' | 'pagado'
  invoiced_at: string
  paid_at: string | null
  paid_amount: number | null
  notes: string | null
  created_at: string
  client?: { name: string }
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
  invoice_id: string | null
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

export interface CompanyWebOrder {
  id: string
  public_id: string
  customer_name: string
  company_name: string
  date: string
  status: string
  total: number
  items: { name: string; quantity: number; unit_price: number; subtotal: number }[]
}

// Normaliza texto para matchear "AVSA", "avsa", "AVSA Argentina Valores", "Argentina Valores SA"
// contra el mismo company_client, sin depender de que el cliente tipee el nombre exacto
function normalizeCompanyText(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '')
}

function matchesClient(orderCompanyName: string, clientName: string): boolean {
  if (!orderCompanyName.trim()) return false
  const orderWords = new Set(normalizeCompanyText(orderCompanyName).split(/\s+/).filter(w => w.length >= 4))
  const clientWords = normalizeCompanyText(clientName).split(/\s+/).filter(w => w.length >= 4)
  return clientWords.some(w => orderWords.has(w))
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
    price_mode?: PriceMode
    iva_rate?: number
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

  // ── Facturación / cuenta corriente ──────────────────────────────────────────

  // Dispatches for a client in a period that haven't been invoiced yet
  getUninvoicedDispatches: async (clientId: string, from: string, to: string): Promise<CompanyDispatch[]> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('company_dispatches')
      .select('*, items:company_dispatch_items(*)')
      .eq('store_id', storeId)
      .eq('client_id', clientId)
      .is('invoice_id', null)
      .gte('date', from)
      .lte('date', to)
      .order('date')
    if (error) throw error
    return data || []
  },

  // Total real de un despacho, sumado desde los items (evita depender del campo `total`
  // guardado en la tabla, que puede haber quedado desactualizado)
  dispatchTotal: (dispatch: CompanyDispatch): number =>
    (dispatch.items || []).reduce((s, it) => s + Number(it.subtotal), 0),

  // Pedidos web de la tienda Empresas para un cliente en un período, sin facturar todavía.
  // El total se calcula siempre desde los items — la columna orders.total no se mantiene
  // actualizada para pedidos B2B.
  getWebOrdersForClient: async (clientName: string, from: string, to: string): Promise<CompanyWebOrder[]> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('orders')
      .select('id, public_id, customer_name, status, created_at, metadata, order_items(name, product_name, quantity, unit_price, subtotal)')
      .eq('store_id', storeId)
      .is('invoice_id', null)
      .neq('status', 'cancelled')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
    if (error) throw error

    type Row = {
      id: string; public_id: string; customer_name: string; status: string; created_at: string
      metadata: Record<string, unknown> | null
      order_items: { name: string | null; product_name: string | null; quantity: number; unit_price: number; subtotal: number | null }[]
    }
    return ((data || []) as unknown as Row[])
      .map(o => ({ ...o, companyName: String(o.metadata?.company_name || '') }))
      .filter(o => matchesClient(o.companyName, clientName))
      .map(o => {
        const items = (o.order_items || []).map(it => ({
          name: it.name || it.product_name || 'Producto',
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          subtotal: Number(it.subtotal ?? it.quantity * it.unit_price),
        }))
        return {
          id: o.id, public_id: o.public_id, customer_name: o.customer_name,
          company_name: o.companyName, date: o.created_at.split('T')[0], status: o.status,
          total: items.reduce((s, it) => s + it.subtotal, 0),
          items,
        }
      })
  },

  // Compute subtotal/IVA/total for a combined amount, given the client's price mode
  computeInvoiceAmounts: (sum: number, priceMode: PriceMode, ivaRate: number) => {
    if (priceMode === 'iva_incluido') {
      const subtotal = sum / (1 + ivaRate / 100)
      return { subtotal, iva_amount: sum - subtotal, total: sum }
    }
    const iva_amount = sum * (ivaRate / 100)
    return { subtotal: sum, iva_amount, total: sum + iva_amount }
  },

  createInvoice: async (clientId: string, from: string, to: string, notes?: string): Promise<CompanyInvoice> => {
    const storeId = await getStoreId()
    const { data: client, error: clientError } = await supabase
      .from('company_clients').select('name, price_mode, iva_rate').eq('id', clientId).single()
    if (clientError) throw clientError

    const [dispatches, webOrders] = await Promise.all([
      companyDispatchApi.getUninvoicedDispatches(clientId, from, to),
      companyDispatchApi.getWebOrdersForClient(client.name, from, to),
    ])
    if (dispatches.length === 0 && webOrders.length === 0) throw new Error('No hay despachos ni pedidos web sin facturar en ese período')

    const sum = dispatches.reduce((s, d) => s + companyDispatchApi.dispatchTotal(d), 0)
      + webOrders.reduce((s, o) => s + o.total, 0)
    const { subtotal, iva_amount, total } = companyDispatchApi.computeInvoiceAmounts(
      sum, client.price_mode as PriceMode, Number(client.iva_rate),
    )

    const { data: invoice, error } = await supabase
      .from('company_invoices')
      .insert({ store_id: storeId, client_id: clientId, period_from: from, period_to: to, subtotal, iva_amount, total, notes: notes || null })
      .select()
      .single()
    if (error) throw error

    if (dispatches.length > 0) {
      const { error: linkError } = await supabase
        .from('company_dispatches').update({ invoice_id: invoice.id }).in('id', dispatches.map(d => d.id))
      if (linkError) throw linkError
    }
    if (webOrders.length > 0) {
      const { error: linkError } = await supabase
        .from('orders').update({ invoice_id: invoice.id }).in('id', webOrders.map(o => o.id))
      if (linkError) throw linkError
    }

    return invoice
  },

  listInvoices: async (params?: { client_id?: string; status?: 'facturado' | 'pagado' }): Promise<CompanyInvoice[]> => {
    const storeId = await getStoreId()
    let query = supabase
      .from('company_invoices')
      .select('*, client:company_clients(name)')
      .eq('store_id', storeId)
      .order('period_to', { ascending: false })
    if (params?.client_id) query = query.eq('client_id', params.client_id)
    if (params?.status) query = query.eq('status', params.status)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  markInvoicePaid: async (id: string, paidAmount: number, notes?: string): Promise<CompanyInvoice> => {
    const { data, error } = await supabase
      .from('company_invoices')
      .update({ status: 'pagado', paid_at: new Date().toISOString(), paid_amount: paidAmount, notes: notes ?? undefined })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  deleteInvoice: async (id: string) => {
    await supabase.from('company_dispatches').update({ invoice_id: null }).eq('invoice_id', id)
    await supabase.from('orders').update({ invoice_id: null }).eq('invoice_id', id)
    const { error } = await supabase.from('company_invoices').delete().eq('id', id)
    if (error) throw error
  },

  // ── Cross-store (mismo dueño) ───────────────────────────────────────────────

  // Despachos de TODAS las tiendas del mismo dueño en un rango (para conciliar stock desde otra tienda, ej. CABA leyendo Empresas)
  crossStoreDispatchItemsByDate: async (from: string, to: string): Promise<{ date: string; product_name: string; quantity: number; store_id: string }[]> => {
    const { data, error } = await supabase
      .from('company_dispatches')
      .select('date, store_id, items:company_dispatch_items(product_name, quantity)')
      .gte('date', from)
      .lte('date', to)
    if (error) throw error
    const rows: { date: string; product_name: string; quantity: number; store_id: string }[] = []
    for (const d of (data || []) as unknown as { date: string; store_id: string; items: { product_name: string; quantity: number }[] }[]) {
      for (const item of d.items || []) {
        rows.push({ date: d.date, product_name: item.product_name, quantity: item.quantity, store_id: d.store_id })
      }
    }
    return rows
  },
}
