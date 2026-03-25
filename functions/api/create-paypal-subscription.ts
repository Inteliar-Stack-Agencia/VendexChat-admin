interface Env {
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  PAYPAL_SANDBOX?: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  VITE_ADMIN_URL?: string
  ADMIN_URL?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

interface PlanRow {
  id: string
  name: string
  price_usd: number
  annual_price_usd: number
}

async function getPlanFromSupabase(supabaseUrl: string, serviceRoleKey: string, planId: string): Promise<PlanRow | null> {
  const url = `${supabaseUrl}/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=id,name,price_usd,annual_price_usd&limit=1`
  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Supabase plans query failed: ${res.status}`)
  const rows = await res.json() as PlanRow[]
  return rows[0] ?? null
}

async function getPayPalAccessToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`PayPal OAuth error: ${res.status} ${errText}`)
  }
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function createPayPalProduct(baseUrl: string, token: string, planName: string): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `VENDEx ${planName}`,
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`PayPal create product error: ${res.status} ${errText}`)
  }
  const data = await res.json() as { id: string }
  return data.id
}

async function createPayPalPlan(
  baseUrl: string,
  token: string,
  productId: string,
  planName: string,
  billingCycle: string,
  priceUsd: number,
): Promise<string> {
  const isAnnual = billingCycle === 'annual'
  const intervalCount = isAnnual ? 12 : 1
  const planLabel = isAnnual ? 'Anual' : 'Mensual'

  const res = await fetch(`${baseUrl}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name: `VENDEx ${planName} - ${planLabel}`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: intervalCount,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: priceUsd.toFixed(2),
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
      status: 'ACTIVE',
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`PayPal create plan error: ${res.status} ${errText}`)
  }
  const data = await res.json() as { id: string }
  return data.id
}

interface PayPalLink {
  href: string
  rel: string
  method?: string
}

async function createPayPalSubscription(
  baseUrl: string,
  token: string,
  paypalPlanId: string,
  customId: string,
  userEmail: string | undefined,
  adminUrl: string,
): Promise<{ id: string; approveLink: string }> {
  const body: Record<string, unknown> = {
    plan_id: paypalPlanId,
    custom_id: customId,
    application_context: {
      brand_name: 'VENDEx',
      return_url: `${adminUrl}/subscription/success`,
      cancel_url: `${adminUrl}/subscription`,
      user_action: 'SUBSCRIBE_NOW',
      shipping_preference: 'NO_SHIPPING',
    },
  }

  if (userEmail) {
    body.subscriber = { email_address: userEmail }
  }

  const res = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`PayPal create subscription error: ${res.status} ${errText}`)
  }
  const data = await res.json() as { id: string; links: PayPalLink[] }
  const approveLink = data.links.find(l => l.rel === 'approve')?.href
  if (!approveLink) throw new Error('PayPal subscription approve link not found')
  return { id: data.id, approveLink }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: corsHeaders })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return json({ error: 'PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET no configurados' }, 500)
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return json({ error: 'Supabase env vars no configurados' }, 500)
  }

  let body: { plan_id?: string; billing_cycle?: string; store_id?: string; user_email?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Body inválido' }, 400)
  }

  const { plan_id, billing_cycle, store_id, user_email } = body
  if (!plan_id || !billing_cycle || !store_id) {
    return json({ error: 'plan_id, billing_cycle y store_id son requeridos' }, 400)
  }

  let plan: PlanRow | null
  try {
    plan = await getPlanFromSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, plan_id)
  } catch (err) {
    return json({ error: `No se pudo leer el plan: ${(err as Error).message}` }, 502)
  }

  if (!plan) return json({ error: `Plan inválido: ${plan_id}` }, 400)
  if (plan.price_usd === 0 && plan.annual_price_usd === 0) {
    return json({ error: `El plan ${plan_id} no tiene precio definido` }, 400)
  }

  const priceUsd = billing_cycle === 'annual' ? plan.annual_price_usd : plan.price_usd
  const isSandbox = env.PAYPAL_SANDBOX === 'true'
  const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
  const adminUrl = env.ADMIN_URL || env.VITE_ADMIN_URL || 'https://admin.vendexchat.app'

  try {
    const accessToken = await getPayPalAccessToken(baseUrl, env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET)

    const productId = await createPayPalProduct(baseUrl, accessToken, plan.name)

    const paypalPlanId = await createPayPalPlan(baseUrl, accessToken, productId, plan.name, billing_cycle, priceUsd)

    const customId = `${store_id}|${plan_id}|${billing_cycle}`
    const { id: subscriptionId, approveLink } = await createPayPalSubscription(
      baseUrl,
      accessToken,
      paypalPlanId,
      customId,
      user_email,
      adminUrl,
    )

    return json({
      checkout_url: approveLink,
      subscription_id: subscriptionId,
    })
  } catch (err) {
    return json({ error: (err as Error).message }, 502)
  }
}
