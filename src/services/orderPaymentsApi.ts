import { supabase } from '../supabaseClient'

// Tracking de pago para pedidos SUELTOS (sin invoice_id) de CABA/La Plata.
// Los pedidos ya facturados a una empresa (invoice_id != null) se pagan y controlan
// desde la factura en company_invoices — no acá, para no duplicar el ingreso en el P&L.
export type PaymentMethod = 'efectivo' | 'qr' | 'transferencia' | 'tarjeta'

export const orderPaymentsApi = {
  markAsPaid: async (
    orderId: string,
    paidAmount: number,
    paymentMethod: PaymentMethod,
    currentMetadata: Record<string, unknown> | null | undefined,
    notes?: string,
  ) => {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_amount: paidAmount,
        paid_at: new Date().toISOString(),
        payment_notes: notes || null,
        metadata: { ...(currentMetadata || {}), payment_method: paymentMethod },
      })
      .eq('id', orderId)
    if (error) throw error
  },

  markAsPartial: async (
    orderId: string,
    paidAmount: number,
    paymentMethod: PaymentMethod,
    currentMetadata: Record<string, unknown> | null | undefined,
    notes?: string,
  ) => {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'partial',
        paid_amount: paidAmount,
        paid_at: new Date().toISOString(),
        payment_notes: notes || null,
        metadata: { ...(currentMetadata || {}), payment_method: paymentMethod },
      })
      .eq('id', orderId)
    if (error) throw error
  },

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
}
