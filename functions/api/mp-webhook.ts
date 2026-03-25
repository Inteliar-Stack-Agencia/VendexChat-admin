import { sendTelegramMessage } from '../lib/telegram'

interface Env {
  MP_ACCESS_TOKEN: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}


async function getPayment(paymentId: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`MP payment fetch error: ${res.status}`)
  return res.json() as Promise<{
    id: number
    status: string
    external_reference: string
    transaction_amount: number
  }>
}

async function getPreapproval(preapprovalId: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`MP preapproval fetch error: ${res.status}`)
  return res.json() as Promise<{
    id: string
    status: string
    external_reference: string
    summarized?: { next_charge_date?: string }
  }>
}

async function getAuthorizedPayment(authorizedPaymentId: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`MP authorized_payment fetch error: ${res.status}`)
  return res.json() as Promise<{
    id: number
    status: string
    external_reference: string
    preapproval_id: string
    payment?: { status_detail?: string }
  }>
}

function addPeriod(date: Date, cycle: string): Date {
  const d = new Date(date)
  if (cycle === 'annual') {
    d.setMonth(d.getMonth() + 12)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

interface UpsertOptions {
  storeId: string
  planId: string
  billingCycle: string
  paymentId?: string
  status: string
  currentPeriodEnd?: string
  mpPreapprovalId?: string
  lastPaymentStatus?: string
  paymentFailureReason?: string
}

async function upsertSubscription(env: Env, opts: UpsertOptions) {
  const now = new Date()

  const payload: Record<string, unknown> = {
    store_id: opts.storeId,
    plan_type: opts.planId,
    status: opts.status,
    billing_cycle: opts.billingCycle,
    updated_at: now.toISOString(),
  }

  if (opts.paymentId !== undefined) {
    payload.mp_payment_id = String(opts.paymentId)
  }
  if (opts.mpPreapprovalId !== undefined) {
    payload.mp_preapproval_id = opts.mpPreapprovalId
  }
  if (opts.lastPaymentStatus !== undefined) {
    payload.last_payment_status = opts.lastPaymentStatus
  }
  if (opts.paymentFailureReason !== undefined) {
    payload.payment_failure_reason = opts.paymentFailureReason
  }
  if (opts.currentPeriodEnd !== undefined) {
    payload.current_period_end = opts.currentPeriodEnd
  }
  if (opts.status === 'active' && !opts.currentPeriodEnd) {
    payload.current_period_start = now.toISOString()
    payload.current_period_end = addPeriod(now, opts.billingCycle).toISOString()
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?on_conflict=store_id`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Supabase upsert error: ${errText}`)
  }
}

async function updateSubscriptionByPreapprovalId(env: Env, preapprovalId: string, update: Record<string, unknown>) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?mp_preapproval_id=eq.${encodeURIComponent(preapprovalId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...update, updated_at: new Date().toISOString() }),
    }
  )
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Supabase patch error: ${errText}`)
  }
}

async function getSubscriptionByPreapprovalId(env: Env, preapprovalId: string) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?mp_preapproval_id=eq.${encodeURIComponent(preapprovalId)}&select=id,store_id,billing_cycle,current_period_end&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        Accept: 'application/json',
      },
    }
  )
  if (!res.ok) throw new Error(`Supabase select error: ${res.status}`)
  const rows = await res.json() as Array<{ id: string; store_id: string; billing_cycle: string; current_period_end: string | null }>
  return rows[0] ?? null
}

async function activateStore(env: Env, storeId: string) {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: true }),
    }
  )
}

async function deactivateStore(env: Env, storeId: string) {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: false }),
    }
  )
}

// MP sends both GET (for webhook verification) and POST (for notifications)
export const onRequestGet: PagesFunction = async () =>
  new Response('ok', { status: 200 })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Always return 200 to MP so it doesn't retry indefinitely
  try {
    if (!env.MP_ACCESS_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      console.error('[mp-webhook] Missing env vars')
      return new Response('ok', { status: 200 })
    }

    const body = await request.json() as { type?: string; data?: { id?: string | number } }

    // Handle legacy payment notifications
    if (body.type === 'payment') {
      const paymentId = body.data?.id
      if (!paymentId) return new Response('ok', { status: 200 })

      const payment = await getPayment(String(paymentId), env.MP_ACCESS_TOKEN)

      if (payment.status !== 'approved') {
        console.log(`[mp-webhook] Payment ${paymentId} status: ${payment.status} — skipped`)
        return new Response('ok', { status: 200 })
      }

      const parts = (payment.external_reference || '').split('|')
      if (parts.length !== 3) {
        console.error('[mp-webhook] Invalid external_reference:', payment.external_reference)
        return new Response('ok', { status: 200 })
      }

      const [storeId, planId, billingCycle] = parts

      await upsertSubscription(env, {
        storeId,
        planId,
        billingCycle,
        paymentId: String(payment.id),
        status: 'active',
      })
      await activateStore(env, storeId)

      await sendTelegramMessage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
        `💳 <b>Pago recibido — MercadoPago</b>\n\n🏪 Tienda: <code>${storeId}</code>\n📦 Plan: <b>${planId}</b> (${billingCycle})\n💰 Monto: $${payment.transaction_amount}\n✅ Estado: Suscripción activada`,
        'payment'
      )

      console.log(`[mp-webhook] Subscription activated (payment): store=${storeId} plan=${planId} cycle=${billingCycle}`)
      return new Response('ok', { status: 200 })
    }

    // Handle preapproval (subscription status changes)
    if (body.type === 'subscription_preapproval') {
      const preapprovalId = body.data?.id
      if (!preapprovalId) return new Response('ok', { status: 200 })

      const preapproval = await getPreapproval(String(preapprovalId), env.MP_ACCESS_TOKEN)

      const parts = (preapproval.external_reference || '').split('|')
      if (parts.length !== 3) {
        console.error('[mp-webhook] Invalid external_reference on preapproval:', preapproval.external_reference)
        return new Response('ok', { status: 200 })
      }

      const [storeId, planId, billingCycle] = parts
      const nextChargeDate = preapproval.summarized?.next_charge_date

      if (preapproval.status === 'authorized') {
        await upsertSubscription(env, {
          storeId,
          planId,
          billingCycle,
          status: 'active',
          mpPreapprovalId: preapproval.id,
          currentPeriodEnd: nextChargeDate,
        })
        await activateStore(env, storeId)
        await sendTelegramMessage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
          `🔔 <b>Suscripción activada — MercadoPago</b>\n\n🏪 Tienda: <code>${storeId}</code>\n📦 Plan: <b>${planId}</b> (${billingCycle})\n📅 Próximo cobro: ${nextChargeDate ?? 'N/A'}\n✅ Estado: Activa`,
          'subscription'
        )
        console.log(`[mp-webhook] Preapproval authorized: store=${storeId} plan=${planId} cycle=${billingCycle}`)
      } else if (preapproval.status === 'paused' || preapproval.status === 'cancelled') {
        await upsertSubscription(env, {
          storeId,
          planId,
          billingCycle,
          status: 'cancelled',
          mpPreapprovalId: preapproval.id,
        })
        await deactivateStore(env, storeId)
        await sendTelegramMessage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
          `⚠️ <b>Suscripción cancelada — MercadoPago</b>\n\n🏪 Tienda: <code>${storeId}</code>\n📦 Plan: <b>${planId}</b> (${billingCycle})\n❌ Estado: ${preapproval.status}`,
          'subscription'
        )
        console.log(`[mp-webhook] Preapproval ${preapproval.status}: store=${storeId}`)
      } else {
        console.log(`[mp-webhook] Preapproval status ${preapproval.status} — no action`)
      }

      return new Response('ok', { status: 200 })
    }

    // Handle authorized payments (recurring charge results)
    if (body.type === 'subscription_authorized_payment') {
      const authorizedPaymentId = body.data?.id
      if (!authorizedPaymentId) return new Response('ok', { status: 200 })

      const authorizedPayment = await getAuthorizedPayment(String(authorizedPaymentId), env.MP_ACCESS_TOKEN)

      const parts = (authorizedPayment.external_reference || '').split('|')
      if (parts.length !== 3) {
        console.error('[mp-webhook] Invalid external_reference on authorized_payment:', authorizedPayment.external_reference)
        return new Response('ok', { status: 200 })
      }

      const [storeId, , billingCycle] = parts
      const preapprovalId = authorizedPayment.preapproval_id

      if (authorizedPayment.status === 'authorized') {
        // Extend the current period end
        const existing = preapprovalId ? await getSubscriptionByPreapprovalId(env, preapprovalId) : null
        let newPeriodEnd: string | undefined

        if (existing?.current_period_end) {
          newPeriodEnd = addPeriod(new Date(existing.current_period_end), billingCycle).toISOString()
        } else {
          newPeriodEnd = addPeriod(new Date(), billingCycle).toISOString()
        }

        if (preapprovalId) {
          await updateSubscriptionByPreapprovalId(env, preapprovalId, {
            last_payment_status: 'authorized',
            current_period_end: newPeriodEnd,
            status: 'active',
          })
        }
        await sendTelegramMessage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
          `💰 <b>Cobro recurrente exitoso — MercadoPago</b>\n\n🏪 Tienda: <code>${storeId}</code>\n📅 Nuevo período hasta: ${newPeriodEnd}`,
          'payment'
        )
        console.log(`[mp-webhook] Authorized payment processed: store=${storeId} new period end=${newPeriodEnd}`)
      } else {
        // Payment failed — mark as past_due, do NOT deactivate store (MP will retry)
        const statusDetail = authorizedPayment.payment?.status_detail ?? authorizedPayment.status

        if (preapprovalId) {
          await updateSubscriptionByPreapprovalId(env, preapprovalId, {
            status: 'past_due',
            last_payment_status: 'payment_failed',
            payment_failure_reason: statusDetail,
          })
        } else {
          // Fallback: update by store_id via external_reference
          await fetch(
            `${env.SUPABASE_URL}/rest/v1/subscriptions?store_id=eq.${encodeURIComponent(storeId)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                apikey: env.SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'past_due',
                last_payment_status: 'payment_failed',
                payment_failure_reason: statusDetail,
                updated_at: new Date().toISOString(),
              }),
            }
          )
        }
        await sendTelegramMessage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY,
          `❌ <b>Pago fallido — MercadoPago</b>\n\n🏪 Tienda: <code>${storeId}</code>\n⚠️ Motivo: ${statusDetail}\n🔄 MP reintentará el cobro automáticamente`,
          'payment'
        )
        console.log(`[mp-webhook] Payment failed: store=${storeId} reason=${statusDetail}`)
      }

      return new Response('ok', { status: 200 })
    }

    // Unknown type — still return 200
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[mp-webhook] Error:', err)
    // Still return 200 so MP doesn't retry
    return new Response('ok', { status: 200 })
  }
}
