import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const orderPaymentsApi = {
  // Marcar un pedido como pagado
  markAsPaid: async (orderId: string, paidAmount: number, notes?: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_amount: paidAmount,
        paid_at: new Date().toISOString(),
        payment_notes: notes || null,
      })
      .eq('id', orderId)
    if (error) throw error
  },

  // Marcar como pago parcial
  markAsPartial: async (orderId: string, paidAmount: number, notes?: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'partial',
        paid_amount: paidAmount,
        paid_at: new Date().toISOString(),
        payment_notes: notes || null,
      })
      .eq('id', orderId)
    if (error) throw error
  },

  // Marcar como no pagado
  markAsPending: async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'pending',
        paid_amount: null,
        paid_at: null,
        payment_notes: null,
      })
      .eq('id', orderId)
    if (error) throw error
  },

  // Obtener resumen de pagos del período
  getSummary: async (params?: { from?: string; to?: string }) => {
    const storeId = await getStoreId()

    let query = supabase
      .from('orders')
      .select('payment_status, paid_amount, total')
      .eq('store_id', storeId)
      .eq('status', 'completed') // Solo pedidos completados

    if (params?.from) query = query.gte('paid_at', params.from)
    if (params?.to) query = query.lte('paid_at', params.to)

    const { data, error } = await query

    if (error) throw error

    return {
      total_orders: data?.length || 0,
      paid_orders: data?.filter(o => o.payment_status === 'paid').length || 0,
      partial_orders: data?.filter(o => o.payment_status === 'partial').length || 0,
      pending_orders: data?.filter(o => o.payment_status === 'pending').length || 0,
      total_amount: (data || []).reduce((sum, o) => sum + Number(o.total || 0), 0),
      paid_amount: (data || []).reduce((sum, o) => sum + Number(o.paid_amount || 0), 0),
    }
  },
}
