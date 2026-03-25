interface Env {
  MP_ACCESS_TOKEN: string
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

async function getExchangeRate(token: string): Promise<number> {
  const res = await fetch(
    'https://api.mercadopago.com/currency_conversions/search?from=USD&to=ARS',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`MP exchange rate API error: ${res.status}`)
  const data = await res.json() as { ratio?: number }
  if (!data.ratio) throw new Error('Tipo de cambio no disponible')
  return data.ratio
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: corsHeaders })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.MP_ACCESS_TOKEN) return json({ error: 'MP_ACCESS_TOKEN no configurado' }, 500)
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

  let exchangeRate: number
  try {
    exchangeRate = await getExchangeRate(env.MP_ACCESS_TOKEN)
  } catch (err) {
    return json({ error: `No se pudo obtener el tipo de cambio: ${(err as Error).message}` }, 502)
  }

  const priceArs = Math.round(priceUsd * exchangeRate)

  const adminUrl = env.ADMIN_URL || env.VITE_ADMIN_URL || 'https://admin.vendexchat.app'
  const notificationUrl = `${adminUrl}/api/mp-webhook`

  const frequency = billing_cycle === 'annual' ? 12 : 1
  const frequencyType = 'months'

  const preapproval = {
    reason: `${plan.name} - ${billing_cycle === 'annual' ? 'Anual' : 'Mensual'}`,
    external_reference: `${store_id}|${plan_id}|${billing_cycle}`,
    payer_email: user_email ?? '',
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: priceArs,
      currency_id: 'ARS',
    },
    back_url: `${adminUrl}/subscription/success`,
    notification_url: notificationUrl,
    status: 'pending',
  }

  try {
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapproval),
    })

    if (!mpRes.ok) {
      const errText = await mpRes.text()
      return json({ error: `MP Preapproval error: ${errText}` }, 502)
    }

    const mpData = await mpRes.json() as { id: string; init_point: string; sandbox_init_point?: string }

    return json({
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preapproval_id: mpData.id,
      price_usd: priceUsd,
      price_ars: priceArs,
      exchange_rate: exchangeRate,
    })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
}
