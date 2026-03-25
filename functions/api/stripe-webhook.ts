interface Env {
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
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

async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  // Parse t= and v1= from the Stripe-Signature header
  const parts = signatureHeader.split(',')
  let timestamp = ''
  let v1Signature = ''
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') v1Signature = value
  }

  if (!timestamp || !v1Signature) return false

  const signedPayload = `${timestamp}.${rawBody}`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(signedPayload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

  // Convert to hex
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signatureHex === v1Signature
}

async function getSubscriptionByStripeId(
  env: Env,
  stripeSubscriptionId: string
): Promise<{ store_id: string; plan_type: string; billing_cycle: string } | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubscriptionId)}&select=store_id,plan_type,billing_cycle&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        Accept: 'application/json',
      },
    }
  )
  if (!res.ok) throw new Error(`Supabase select error: ${res.status}`)
  const rows = await res.json() as Array<{ store_id: string; plan_type: string; billing_cycle: string }>
  return rows[0] ?? null
}

async function upsertSubscription(
  env: Env,
  opts: {
    storeId: string
    planId: string
    billingCycle: string
    status: string
    stripeSubscriptionId: string
    stripeCustomerId: string
    lastPaymentStatus?: string
  }
) {
  const now = new Date()
  const payload: Record<string, unknown> = {
    store_id: opts.storeId,
    plan_type: opts.planId,
    status: opts.status,
    billing_cycle: opts.billingCycle,
    stripe_subscription_id: opts.stripeSubscriptionId,
    stripe_customer_id: opts.stripeCustomerId,
    current_period_start: now.toISOString(),
    current_period_end: addPeriod(now, opts.billingCycle).toISOString(),
    last_payment_status: opts.lastPaymentStatus ?? 'authorized',
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

async function updateSubscriptionByStripeId(
  env: Env,
  stripeSubscriptionId: string,
  update: Record<string, unknown>
) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubscriptionId)}`,
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

// Stripe only sends POST
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Always return 200 to Stripe so it doesn't retry indefinitely
  try {
    if (!env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      console.error('[stripe-webhook] Missing env vars')
      return new Response('ok', { status: 200 })
    }

    const rawBody = await request.text()
    const signatureHeader = request.headers.get('Stripe-Signature') || ''

    const valid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET)
    if (!valid) {
      console.error('[stripe-webhook] Signature verification failed')
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(rawBody) as {
      type: string
      data: { object: Record<string, unknown> }
    }

    console.log(`[stripe-webhook] Event: ${event.type}`)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string
        subscription?: string
        customer?: string
        metadata?: { store_id?: string; plan_id?: string; billing_cycle?: string }
      }

      const storeId = session.metadata?.store_id
      const planId = session.metadata?.plan_id
      const billingCycle = session.metadata?.billing_cycle
      const stripeSubscriptionId = session.subscription
      const stripeCustomerId = session.customer

      if (!storeId || !planId || !billingCycle || !stripeSubscriptionId || !stripeCustomerId) {
        console.error('[stripe-webhook] Missing fields on checkout.session.completed', session.metadata)
        return new Response('ok', { status: 200 })
      }

      await upsertSubscription(env, {
        storeId,
        planId,
        billingCycle,
        status: 'active',
        stripeSubscriptionId,
        stripeCustomerId,
        lastPaymentStatus: 'authorized',
      })
      await activateStore(env, storeId)

      console.log(`[stripe-webhook] Subscription activated: store=${storeId} plan=${planId} cycle=${billingCycle}`)
      return new Response('ok', { status: 200 })
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as {
        subscription?: string
        customer?: string
        lines?: { data?: Array<{ metadata?: Record<string, string> }> }
      }

      const stripeSubscriptionId = invoice.subscription
      if (!stripeSubscriptionId) return new Response('ok', { status: 200 })

      const existing = await getSubscriptionByStripeId(env, stripeSubscriptionId)
      if (!existing) {
        console.log(`[stripe-webhook] No subscription found for stripe_sub=${stripeSubscriptionId}, skipping`)
        return new Response('ok', { status: 200 })
      }

      const now = new Date()
      const newPeriodEnd = addPeriod(now, existing.billing_cycle).toISOString()

      await updateSubscriptionByStripeId(env, stripeSubscriptionId, {
        status: 'active',
        last_payment_status: 'authorized',
        current_period_end: newPeriodEnd,
      })

      console.log(`[stripe-webhook] invoice.payment_succeeded: store=${existing.store_id} new period end=${newPeriodEnd}`)
      return new Response('ok', { status: 200 })
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as {
        subscription?: string
        last_payment_error?: { message?: string }
      }

      const stripeSubscriptionId = invoice.subscription
      if (!stripeSubscriptionId) return new Response('ok', { status: 200 })

      const failureReason = invoice.last_payment_error?.message || 'charge_failed'

      await updateSubscriptionByStripeId(env, stripeSubscriptionId, {
        status: 'past_due',
        last_payment_status: 'payment_failed',
        payment_failure_reason: failureReason,
      })

      console.log(`[stripe-webhook] invoice.payment_failed: stripe_sub=${stripeSubscriptionId} reason=${failureReason}`)
      return new Response('ok', { status: 200 })
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as {
        id: string
      }

      const stripeSubscriptionId = subscription.id
      const existing = await getSubscriptionByStripeId(env, stripeSubscriptionId)

      await updateSubscriptionByStripeId(env, stripeSubscriptionId, {
        status: 'cancelled',
      })

      if (existing?.store_id) {
        await deactivateStore(env, existing.store_id)
        console.log(`[stripe-webhook] Subscription cancelled: store=${existing.store_id}`)
      } else {
        console.log(`[stripe-webhook] Subscription cancelled: stripe_sub=${stripeSubscriptionId} (store not found)`)
      }

      return new Response('ok', { status: 200 })
    }

    // Unknown event type — still return 200
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[stripe-webhook] Error:', err)
    // Still return 200 so Stripe doesn't retry
    return new Response('ok', { status: 200 })
  }
}
