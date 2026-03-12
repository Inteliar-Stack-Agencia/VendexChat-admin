interface Env {
  GOOGLE_API_KEY?: string
  GOOGLE_CX?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: corsHeaders })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { query } = await request.json<{ query?: string }>()

    if (!query?.trim()) {
      return json({ error: 'Query requerida.' }, 400)
    }

    const key = env.GOOGLE_API_KEY
    const cx = env.GOOGLE_CX

    if (!key || !cx) {
      return json({ error: 'Falta GOOGLE_API_KEY o GOOGLE_CX en Cloudflare Pages.' }, 500)
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=10`
    const googleRes = await fetch(url)
    const googleData = await googleRes.json()

    if (!googleRes.ok) {
      const message = googleData?.error?.message || `Google error ${googleRes.status}`
      return json({ error: message, details: googleData?.error || null }, googleRes.status)
    }

    return json({ items: googleData?.items || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en búsqueda de imágenes.'
    return json({ error: message }, 500)
  }
}
