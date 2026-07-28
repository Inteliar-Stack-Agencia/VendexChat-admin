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

// Tiendas B2B "satélite": despachan productos que en realidad son stock/cocina de otra
// tienda (no tienen producción propia). Su ingreso se contabiliza en el P&L de la tienda
// madre, no en el suyo (que quedaría vacío para no duplicar ni confundir con costos sin ingreso).
const REVENUE_ABSORBED_INTO: Record<string, string> = { empresas: 'caba' }
const REVENUE_SIBLING_SLUGS: Record<string, string[]> = { caba: ['empresas'] }

// Una entrada de ingreso reconocido en el P&L (factura de empresa pagada, o pedido propio).
export interface RevenueEntry {
  total: number         // monto neto reconocido (lo que realmente entró)
  created_at: string
  mpFeeLoss: number      // comisión estimada QR/tarjeta (0 para facturas de empresas)
  lostBalance: number    // diferencia entre lo facturado/vendido y lo cobrado
  type: 'invoice' | 'order'
  label: string          // nombre de la empresa, o "#N° cliente" del pedido
  grossAmount: number    // monto facturado/teórico original (antes de descuentos)
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

  // Ingresos mensuales para P&L, en base caja (lo que realmente entró, cuando entró):
  // - Facturas de empresas (company_invoices): solo las que están 'pagado', por paid_amount
  //   (no el total original — puede haber descuento/negociación al cobrar) y en la fecha de
  //   paid_at (no invoiced_at) para que coincida con el mes real de caja.
  // - Si la tienda tiene una satélite de despacho B2B (ej. CABA ← Empresas), suma también
  //   las facturas pagadas de esa satélite.
  // - Si la tienda ES una satélite absorbida por otra (ej. Empresas), no muestra ingresos acá.
  // - Pedidos sueltos (sin invoice_id, venta normal de mostrador/web): si se marcó pago manual
  //   (payment_status paid/partial), usa paid_amount; si no, usa el total calculado desde items
  //   (columna `orders.total` puede haber quedado desactualizada).
  // Cada fila trae además, sin afectar `total` (que sigue siendo el ingreso neto real):
  // - `lostBalance`: diferencia entre lo facturado y lo cobrado en facturas de empresas
  //   (descuentos/negociación al pagar).
  // - `mpFeeLoss`: comisión estimada (según % configurado en Ajustes → Pagos) sobre pedidos
  //   pagados con QR/tarjeta.
  // Sirven para mostrar por separado, en el Balance & P&L, cuánto de lo vendido/facturado no
  // termina entrando — así el informe a socios explica la diferencia en vez de esconderla.
  getMonthlyRevenue: async (year: number) => {
    const storeId = await getStoreId()
    const from = `${year}-01-01T00:00:00`
    const to = `${year}-12-31T23:59:59`

    const { data: ownStore, error: ownStoreError } = await supabase
      .from('stores').select('slug, metadata').eq('id', storeId).single()
    if (ownStoreError) throw ownStoreError
    const ownSlug = ownStore?.slug as string | undefined
    const mpFeePct = Number((ownStore?.metadata as Record<string, unknown> | null)?.mp_fee_percentage) || 0

    // Tienda satélite (ej. Empresas): su ingreso ya se cuenta en la tienda madre.
    if (ownSlug && REVENUE_ABSORBED_INTO[ownSlug]) {
      return [] as RevenueEntry[]
    }

    const siblingSlugs = (ownSlug && REVENUE_SIBLING_SLUGS[ownSlug]) || []
    let siblingStoreIds: string[] = []
    if (siblingSlugs.length > 0) {
      const { data: siblings, error: siblingsError } = await supabase
        .from('stores').select('id').in('slug', siblingSlugs)
      if (siblingsError) throw siblingsError
      siblingStoreIds = (siblings || []).map(s => s.id)
    }

    const { data: invoices, error: invError } = await supabase
      .from('company_invoices')
      .select('total, paid_amount, paid_at, client:company_clients(name)')
      .in('store_id', [storeId, ...siblingStoreIds])
      .eq('status', 'pagado')
      .gte('paid_at', from)
      .lte('paid_at', to)
    if (invError) throw invError
    // Las facturas a empresas se cobran por transferencia/efectivo, no por QR/tarjeta — sin comisión.
    const invoiceRevenue: RevenueEntry[] = (invoices || []).map(i => {
      const paidAmount = Number(i.paid_amount ?? 0)
      const invoicedTotal = Number(i.total ?? 0)
      const client = i.client as unknown as { name: string } | { name: string }[] | null
      const clientName = Array.isArray(client) ? client[0]?.name : client?.name
      return {
        total: paidAmount,
        created_at: i.paid_at as string,
        mpFeeLoss: 0,
        lostBalance: Math.max(0, invoicedTotal - paidAmount),
        type: 'invoice',
        label: clientName || 'Empresa',
        grossAmount: invoicedTotal,
      }
    })

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('order_number, customer_name, created_at, status, payment_status, paid_amount, paid_at, metadata, order_items(quantity, unit_price, subtotal)')
      .eq('store_id', storeId)
      .is('invoice_id', null)
      .gte('created_at', from)
      .lte('created_at', to)
    if (ordersError) throw ordersError
    const orderRevenue: RevenueEntry[] = (ordersData || [])
      .filter((o) => o.status !== 'cancelled')
      .map((o) => {
        const paymentMethod = (o.metadata as Record<string, unknown> | null)?.payment_method
        const hasMpFee = mpFeePct > 0 && (paymentMethod === 'qr' || paymentMethod === 'tarjeta')
        const itemsTotal = (o.order_items || []).reduce((s: number, it: { quantity: number; unit_price: number; subtotal: number | null }) =>
          s + Number(it.subtotal ?? it.quantity * it.unit_price), 0)
        const label = `#${o.order_number || ''} ${o.customer_name || ''}`.trim()

        if ((o.payment_status === 'paid' || o.payment_status === 'partial') && o.paid_amount != null) {
          const total = Number(o.paid_amount)
          return {
            created_at: o.paid_at || o.created_at,
            total,
            mpFeeLoss: hasMpFee ? total * mpFeePct / 100 : 0,
            lostBalance: Math.max(0, itemsTotal - total),
            type: 'order',
            label,
            grossAmount: itemsTotal,
          }
        }
        return {
          created_at: o.created_at,
          total: itemsTotal,
          mpFeeLoss: hasMpFee ? itemsTotal * mpFeePct / 100 : 0,
          lostBalance: 0,
          type: 'order',
          label,
          grossAmount: itemsTotal,
        }
      })

    return [...invoiceRevenue, ...orderRevenue]
  },

  // Suma lo YA cargado como gasto de producción en un rango de fechas (por categoría +
  // prefijo de descripción). Se usa en "Cargar como gasto" (Inventario → Producción)
  // para cobrar solo la DIFERENCIA nueva cuando se sigue cargando producción durante
  // la semana — no recalcula ni pisa lo ya cargado, suma una línea nueva por la parte
  // que todavía no se había cargado.
  sumProductionExpenses: async (from: string, to: string) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('store_id', storeId)
      .eq('category', 'materia_prima')
      .ilike('description', 'Ingreso de viandas%')
      .gte('date', from)
      .lte('date', to)
    if (error) throw error
    return (data || []).reduce((s, e) => s + Number(e.amount), 0)
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

  updateExpense: async (id: string, patch: Partial<Omit<Expense, 'id' | 'store_id' | 'created_at' | 'supplier'>>) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(patch)
      .eq('id', id)
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
