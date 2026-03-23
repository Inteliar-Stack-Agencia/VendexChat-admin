interface Env {
  MP_ACCESS_TOKEN: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// In-memory cache (persists within the same Cloudflare isolate instance, ~1 hour TTL)
let cachedRate: number | null = null
let cacheExpiresAt: number = 0

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: corsHeaders })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const now = Date.now()

  if (cachedRate !== null && now < cacheExpiresAt) {
    return json({ rate: cachedRate, updated_at: new Date(cacheExpiresAt - 3600_000).toISOString(), cached: true })
  }

  if (!env.MP_ACCESS_TOKEN) {
    return json({ error: 'MP_ACCESS_TOKEN no configurado' }, 500)
  }

  try {
    const res = await fetch(
      'https://api.mercadopago.com/currency_conversions/search?from=USD&to=ARS',
      { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } }
    )

    if (!res.ok) {
      return json({ error: `MP API error: ${res.status}` }, 502)
    }

    const data = await res.json() as { ratio?: number }
    const rate = data.ratio

    if (!rate || typeof rate !== 'number') {
      return json({ error: 'No se pudo obtener el tipo de cambio' }, 502)
    }

    cachedRate = rate
    cacheExpiresAt = now + 3600_000 // 1 hour

    return json({ rate, updated_at: new Date().toISOString(), cached: false })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
}
