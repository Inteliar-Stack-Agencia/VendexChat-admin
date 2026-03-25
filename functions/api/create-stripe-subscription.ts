interface Env {
  STRIPE_SECRET_KEY: string
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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: corsHeaders })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'STRIPE_SECRET_KEY no configurado' }, 500)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return json({ error: 'Supabase env vars no configurados' }, 500)

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
  const unitAmount = Math.round(priceUsd * 100) // cents
  const interval = billing_cycle === 'annual' ? 'year' : 'month'
  const productName = `VENDEx ${plan.name} - ${billing_cycle === 'annual' ? 'Anual' : 'Mensual'}`

  const adminUrl = env.ADMIN_URL || env.VITE_ADMIN_URL || 'https://admin.vendexchat.app'
  const successUrl = `${adminUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${adminUrl}/subscription`

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('line_items[0][price_data][currency]', 'usd')
  params.set('line_items[0][price_data][unit_amount]', String(unitAmount))
  params.set('line_items[0][price_data][recurring][interval]', interval)
  params.set('line_items[0][price_data][product_data][name]', productName)
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[store_id]', store_id)
  params.set('metadata[plan_id]', plan_id)
  params.set('metadata[billing_cycle]', billing_cycle)
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('billing_address_collection', 'auto')
  if (user_email) {
    params.set('customer_email', user_email)
  }

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!stripeRes.ok) {
      const errText = await stripeRes.text()
      return json({ error: `Stripe Checkout error: ${errText}` }, 502)
    }

    const session = await stripeRes.json() as { id: string; url: string }

    return json({
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
}
