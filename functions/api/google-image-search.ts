interface Env {
  GOOGLE_API_KEY?: string
  GOOGLE_CX?: string
  VITE_GOOGLE_API_KEY?: string
  VITE_GOOGLE_CX?: string
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

function getSearchQuery(request: Request): string {
  const url = new URL(request.url)
  return url.searchParams.get('query')?.trim() || ''
}

async function runGoogleSearch(query: string, env: Env) {
  const key = env.GOOGLE_API_KEY || env.VITE_GOOGLE_API_KEY
  const cx = env.GOOGLE_CX || env.VITE_GOOGLE_CX

  if (!key || !cx) {
    return json({
      error: 'Faltan credenciales de Google en Cloudflare Pages.',
      hint: 'Configurá GOOGLE_API_KEY y GOOGLE_CX (recomendado) o VITE_GOOGLE_API_KEY y VITE_GOOGLE_CX, y luego hacé redeploy.'
    }, 500)
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1')
  url.searchParams.set('key', key)
  url.searchParams.set('cx', cx)
  url.searchParams.set('q', query)
  url.searchParams.set('searchType', 'image')
  url.searchParams.set('num', '10')

  const googleRes = await fetch(url.toString())
  const googleData = await googleRes.json()

  if (!googleRes.ok) {
    const message = googleData?.error?.message || `Google error ${googleRes.status}`
    return json({ error: message, details: googleData?.error || null }, googleRes.status)
  }

  return json({ items: googleData?.items || [] })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const query = getSearchQuery(request)

  if (!query) {
    return json({
      ok: true,
      message: 'Endpoint activo. Probá /api/google-image-search?query=pizza para verificar resultados.',
      expectedEnv: ['GOOGLE_API_KEY', 'GOOGLE_CX'],
      fallbackEnvSupported: ['VITE_GOOGLE_API_KEY', 'VITE_GOOGLE_CX']
    })
  }

  return runGoogleSearch(query, env)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { query } = await request.json<{ query?: string }>()

    if (!query?.trim()) {
      return json({ error: 'Query requerida.' }, 400)
    }
    return runGoogleSearch(query.trim(), env)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en búsqueda de imágenes.'
    return json({ error: message }, 500)
  }
}
