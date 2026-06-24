import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export interface CashSession {
  id: string
  store_id: string
  date: string
  opening_cash: number
  // Sales by payment method (manual or auto from POS)
  sales_efectivo: number
  sales_qr: number
  sales_transferencia: number
  sales_tarjeta: number
  sales_other: number
  discounts: number
  cash_out: number
  cash_out_notes: string | null
  closing_cash: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CashSessionForm = Omit<CashSession, 'id' | 'store_id' | 'created_at' | 'updated_at'>

export const cashApi = {
  list: async (params?: { from?: string; to?: string }) => {
    const storeId = await getStoreId()
    let q = supabase
      .from('cash_sessions')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false })
    if (params?.from) q = q.gte('date', params.from)
    if (params?.to) q = q.lte('date', params.to)
    const { data, error } = await q
    if (error) throw error
    return (data || []) as CashSession[]
  },

  getByDate: async (date: string): Promise<CashSession | null> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('store_id', storeId)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data as CashSession | null
  },

  // Pull sales totals per payment method from POS orders for a date
  getSalesByPaymentMethod: async (date: string) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('orders')
      .select('total, metadata')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
    if (error) throw error

    const totals = {
      efectivo: 0,
      qr: 0,
      transferencia: 0,
      tarjeta: 0,
      other: 0,
      discounts: 0,
    }

    for (const order of (data || [])) {
      const pm: string = (order.metadata as Record<string, unknown>)?.payment_method as string || 'other'
      const discount: number = Number((order.metadata as Record<string, unknown>)?.discount_amount || 0)
      const total = Number(order.total)
      totals.discounts += discount
      if (pm === 'efectivo') totals.efectivo += total
      else if (pm === 'mercadopago' || pm === 'qr') totals.qr += total
      else if (pm === 'transferencia') totals.transferencia += total
      else if (pm === 'tarjeta') totals.tarjeta += total
      else totals.other += total
    }

    return totals
  },

  upsert: async (form: CashSessionForm): Promise<CashSession> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('cash_sessions')
      .upsert(
        { ...form, store_id: storeId, updated_at: new Date().toISOString() },
        { onConflict: 'store_id,date' },
      )
      .select()
      .single()
    if (error) throw error
    return data as CashSession
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('cash_sessions').delete().eq('id', id)
    if (error) throw error
  },
}
