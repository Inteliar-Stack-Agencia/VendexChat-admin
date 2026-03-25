interface Env {
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

async function getSubscriptionByPayPalId(
  env: Env,
  paypalSubId: string,
): Promise<{ store_id: string; plan_type: string; billing_cycle: string; current_period_end: string | null } | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(paypalSubId)}&select=store_id,plan_type,billing_cycle,current_period_end&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        Accept: 'application/json',
      },
    },
  )
  if (!res.ok) throw new Error(`Supabase select error: ${res.status}`)
  const rows = await res.json() as Array<{ store_id: string; plan_type: string; billing_cycle: string; current_period_end: string | null }>
  return rows[0] ?? null
}

async function upsertSubscription(
  env: Env,
  opts: {
    storeId: string
    planId: string
    billingCycle: string
    paypalSubscriptionId: string
    status: string
    lastPaymentStatus?: string
    currentPeriodEnd?: string
  },
) {
  const now = new Date()
  const payload: Record<string, unknown> = {
    store_id: opts.storeId,
    plan_type: opts.planId,
    billing_cycle: opts.billingCycle,
    status: opts.status,
    // Reusing stripe_subscription_id as a generic external_subscription_id for the PayPal subscription ID.
    // Ideally this column would be named paypal_subscription_id, but we reuse it to avoid schema changes.
    stripe_subscription_id: opts.paypalSubscriptionId,
    updated_at: now.toISOString(),
  }

  if (opts.lastPaymentStatus !== undefined) {
    payload.last_payment_status = opts.lastPaymentStatus
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
    },
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Supabase upsert error: ${errText}`)
  }
}

async function updateSubscriptionByPayPalId(
  env: Env,
  paypalSubId: string,
  update: Record<string, unknown>,
) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(paypalSubId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...update, updated_at: new Date().toISOString() }),
    },
  )
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Supabase patch error: ${errText}`)
  }
}

async function setStoreActive(env: Env, storeId: string, isActive: boolean) {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        apikey: env.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: isActive }),
    },
  )
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Always return 200 to PayPal so it doesn't retry indefinitely
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      console.error('[paypal-webhook] Missing env vars')
      return new Response('ok', { status: 200 })
    }

    const body = await request.json() as {
      event_type?: string
      resource?: Record<string, unknown>
    }

    const eventType = body.event_type
    const resource = body.resource ?? {}

    if (!eventType) {
      console.warn('[paypal-webhook] No event_type in body')
      return new Response('ok', { status: 200 })
    }

    console.log(`[paypal-webhook] Received event: ${eventType}`)

    // BILLING.SUBSCRIPTION.ACTIVATED
    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const customId = resource.custom_id as string | undefined
      const paypalSubId = resource.id as string | undefined

      if (!customId || !paypalSubId) {
        console.error('[paypal-webhook] ACTIVATED missing custom_id or id')
        return new Response('ok', { status: 200 })
      }

      const parts = customId.split('|')
      if (parts.length !== 3) {
        console.error('[paypal-webhook] Invalid custom_id format:', customId)
        return new Response('ok', { status: 200 })
      }

      const [storeId, planId, billingCycle] = parts

      await upsertSubscription(env, {
        storeId,
        planId,
        billingCycle,
        paypalSubscriptionId: paypalSubId,
        status: 'active',
        lastPaymentStatus: 'authorized',
      })
      await setStoreActive(env, storeId, true)
      console.log(`[paypal-webhook] Subscription activated: store=${storeId} plan=${planId} cycle=${billingCycle}`)
      return new Response('ok', { status: 200 })
    }

    // PAYMENT.SALE.COMPLETED
    if (eventType === 'PAYMENT.SALE.COMPLETED') {
      const paypalSubId = resource.billing_agreement_id as string | undefined
      if (!paypalSubId) {
        console.warn('[paypal-webhook] SALE.COMPLETED missing billing_agreement_id')
        return new Response('ok', { status: 200 })
      }

      const existing = await getSubscriptionByPayPalId(env, paypalSubId)
      if (!existing) {
        console.warn('[paypal-webhook] SALE.COMPLETED subscription not found for:', paypalSubId)
        return new Response('ok', { status: 200 })
      }

      const baseDate = existing.current_period_end ? new Date(existing.current_period_end) : new Date()
      const newPeriodEnd = addPeriod(baseDate, existing.billing_cycle).toISOString()

      await updateSubscriptionByPayPalId(env, paypalSubId, {
        status: 'active',
        last_payment_status: 'authorized',
        current_period_end: newPeriodEnd,
      })
      console.log(`[paypal-webhook] Sale completed: store=${existing.store_id} new period end=${newPeriodEnd}`)
      return new Response('ok', { status: 200 })
    }

    // PAYMENT.SALE.DENIED or BILLING.SUBSCRIPTION.PAYMENT.FAILED
    if (eventType === 'PAYMENT.SALE.DENIED' || eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      // For SALE.DENIED the sub ID is in billing_agreement_id; for PAYMENT.FAILED it's in id
      const paypalSubId = (resource.billing_agreement_id ?? resource.id) as string | undefined
      if (!paypalSubId) {
        console.warn(`[paypal-webhook] ${eventType} missing subscription id`)
        return new Response('ok', { status: 200 })
      }

      await updateSubscriptionByPayPalId(env, paypalSubId, {
        status: 'past_due',
        last_payment_status: 'payment_failed',
      })
      console.log(`[paypal-webhook] Payment failed event=${eventType} sub=${paypalSubId}`)
      return new Response('ok', { status: 200 })
    }

    // BILLING.SUBSCRIPTION.CANCELLED or BILLING.SUBSCRIPTION.EXPIRED
    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
      const paypalSubId = resource.id as string | undefined
      if (!paypalSubId) {
        console.warn(`[paypal-webhook] ${eventType} missing id`)
        return new Response('ok', { status: 200 })
      }

      const existing = await getSubscriptionByPayPalId(env, paypalSubId)
      await updateSubscriptionByPayPalId(env, paypalSubId, { status: 'cancelled' })
      if (existing?.store_id) {
        await setStoreActive(env, existing.store_id, false)
      }
      console.log(`[paypal-webhook] Subscription ${eventType}: sub=${paypalSubId}`)
      return new Response('ok', { status: 200 })
    }

    // Unknown event — still return 200
    console.log(`[paypal-webhook] Unhandled event type: ${eventType}`)
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[paypal-webhook] Error:', err)
    // Still return 200 so PayPal doesn't retry
    return new Response('ok', { status: 200 })
  }
}
