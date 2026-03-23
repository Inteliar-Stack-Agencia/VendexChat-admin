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

function addPeriod(date: Date, cycle: string): Date {
  const d = new Date(date)
  if (cycle === 'annual') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

async function upsertSubscription(
  env: Env,
  storeId: string,
  planId: string,
  billingCycle: string,
  paymentId: string
) {
  const now = new Date()
  const periodEnd = addPeriod(now, billingCycle)

  const payload = {
    store_id: storeId,
    plan_type: planId,
    status: 'active',
    billing_cycle: billingCycle,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    mp_payment_id: String(paymentId),
    updated_at: now.toISOString(),
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

    // Only process payment notifications
    if (body.type !== 'payment') {
      return new Response('ok', { status: 200 })
    }

    const paymentId = body.data?.id
    if (!paymentId) return new Response('ok', { status: 200 })

    const payment = await getPayment(String(paymentId), env.MP_ACCESS_TOKEN)

    // Only process approved payments
    if (payment.status !== 'approved') {
      console.log(`[mp-webhook] Payment ${paymentId} status: ${payment.status} — skipped`)
      return new Response('ok', { status: 200 })
    }

    // external_reference = "store_id|plan_id|billing_cycle"
    const parts = (payment.external_reference || '').split('|')
    if (parts.length !== 3) {
      console.error('[mp-webhook] Invalid external_reference:', payment.external_reference)
      return new Response('ok', { status: 200 })
    }

    const [storeId, planId, billingCycle] = parts

    await upsertSubscription(env, storeId, planId, billingCycle, String(payment.id))
    await activateStore(env, storeId)

    console.log(`[mp-webhook] Subscription activated: store=${storeId} plan=${planId} cycle=${billingCycle}`)
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[mp-webhook] Error:', err)
    // Still return 200 so MP doesn't retry
    return new Response('ok', { status: 200 })
  }
}
