interface Env {
  GOOGLE_API_KEY?: string
  GOOGLE_CX?: string
  VITE_GOOGLE_API_KEY?: string
  VITE_GOOGLE_CX?: string
}

interface ImageItem {
  link: string
  title: string
  image: { thumbnailLink: string }
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

// --------------- Google Custom Search ---------------

async function tryGoogleSearch(query: string, env: Env): Promise<ImageItem[] | null> {
  const key = (env.GOOGLE_API_KEY || env.VITE_GOOGLE_API_KEY || '').trim()
  const cx = (env.GOOGLE_CX || env.VITE_GOOGLE_CX || '').trim()

  if (!key || !cx) return null

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.set('key', key)
    url.searchParams.set('cx', cx)
    url.searchParams.set('q', query)
    url.searchParams.set('searchType', 'image')
    url.searchParams.set('num', '10')

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const data = await res.json() as { items?: ImageItem[] }
    if (data.items && data.items.length > 0) return data.items
  } catch {
    // Google failed, fall through to fallback
  }

  return null
}

// --------------- DuckDuckGo Image Search (fallback) ---------------

interface DdgImageResult {
  image: string
  title: string
  thumbnail: string
}

async function tryDuckDuckGoSearch(query: string): Promise<ImageItem[] | null> {
  try {
    // Step 1: Get the vqd token from DuckDuckGo
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    const html = await tokenRes.text()

    // Extract vqd token
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/) || html.match(/vqd=([\d-]+)/)
    if (!vqdMatch) return null
    const vqd = vqdMatch[1]

    // Step 2: Fetch images using the token
    const imageUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    })

    if (!imgRes.ok) return null
    const imgData = await imgRes.json() as { results?: DdgImageResult[] }

    if (!imgData.results || imgData.results.length === 0) return null

    return imgData.results.slice(0, 10).map((r) => ({
      link: r.image,
      title: r.title || 'DuckDuckGo Images',
      image: { thumbnailLink: r.thumbnail || r.image }
    }))
  } catch {
    return null
  }
}

// --------------- Main search with auto-fallback ---------------

async function runImageSearch(query: string, env: Env) {
  // Try Google first
  const googleItems = await tryGoogleSearch(query, env)
  if (googleItems && googleItems.length > 0) {
    return json({ items: googleItems, source: 'google' })
  }

  // Fallback to DuckDuckGo
  const ddgItems = await tryDuckDuckGoSearch(query)
  if (ddgItems && ddgItems.length > 0) {
    return json({ items: ddgItems, source: 'duckduckgo' })
  }

  return json({
    items: [],
    error: 'No se encontraron imágenes. Probá con otro término de búsqueda.'
  })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const query = getSearchQuery(request)

  if (!query) {
    return json({
      ok: true,
      message: 'Endpoint activo. Probá /api/google-image-search?query=pizza para verificar resultados.'
    })
  }

  return runImageSearch(query, env)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { query } = await request.json<{ query?: string }>()

    if (!query?.trim()) {
      return json({ error: 'Query requerida.' }, 400)
    }
    return runImageSearch(query.trim(), env)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en búsqueda de imágenes.'
    return json({ error: message }, 500)
  }
}
