/**
 * VendexChat — Domain Proxy Worker
 *
 * Soporta dos modos de routing:
 *
 * 1. Hostname-based:  tienda.com           → tenant con custom_domain='tienda.com'
 * 2. Path-based:      morfiviandas.com/laplata → tenant con custom_domain='morfiviandas.com'
 *                                                            y custom_path='laplata'
 *
 * Para path-based, el root del dominio (/) hace pass-through al servidor original
 * (landing page, etc.) si no hay tenant configurado sin custom_path.
 */

export interface Env {
  STOREFRONT_URL: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

interface StoreRow {
  slug: string
  custom_path: string | null
  name: string | null
  description: string | null
  logo_url: string | null
}

interface ResolvedTenant {
  slug: string
  remainingPath: string
  name: string | null
  description: string | null
  logoUrl: string | null
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tienda no encontrada</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .box { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem; }
    p  { color: #64748b; font-size: 0.95rem; }
    a  { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Tienda no encontrada</h1>
    <p>Este dominio no está asociado a ninguna tienda activa.</p>
    <p style="margin-top:1.5rem"><a href="https://vendexchat.app">Conocé VendexChat →</a></p>
  </div>
</body>
</html>`

/**
 * Resuelve hostname + pathPrefix → { slug, remainingPath }
 *
 * Lógica:
 *   1. Buscar tenant con custom_domain=hostname y custom_path=pathPrefix (path-based)
 *   2. Si no hay, buscar tenant con custom_domain=hostname y custom_path IS NULL (hostname-based)
 *   3. Si tampoco, retornar null (pass-through o 404)
 */
async function resolveTenant(
  hostname: string,
  pathname: string,
  env: Env
): Promise<ResolvedTenant | null> {

  // Extraer el primer segmento del path: "/laplata/productos" → "laplata"
  const segments = pathname.replace(/^\//, '').split('/')
  const firstSegment = segments[0] || ''

  // Traer todos los tenants con este custom_domain (máximo 20, suficiente) — de paso
  // trae nombre/descripción/logo para poder pisar los meta tags de OG/Twitter del HTML
  // proxeado con los datos reales de la tienda (ver rewriteMetaTags).
  const url = `${env.SUPABASE_URL}/rest/v1/stores?select=slug,custom_path,name,description,logo_url&custom_domain=eq.${encodeURIComponent(hostname)}&is_active=eq.true&limit=20`

  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) return null

  const rows = await res.json() as StoreRow[]
  if (!rows.length) return null

  const toTenant = (row: StoreRow, remainingPath: string): ResolvedTenant => ({
    slug: row.slug,
    remainingPath,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url,
  })

  // Intentar match path-based primero
  if (firstSegment) {
    const pathMatch = rows.find(r => r.custom_path === firstSegment)
    if (pathMatch) {
      // El path restante es todo lo que viene después del primer segmento
      const remaining = '/' + segments.slice(1).join('/')
      return toTenant(pathMatch, remaining === '/' ? '' : remaining)
    }
  }

  // Fallback: tenant sin custom_path (hostname-based puro)
  const hostnameMatch = rows.find(r => !r.custom_path)
  if (hostnameMatch) {
    return toTenant(hostnameMatch, pathname === '/' ? '' : pathname)
  }

  return null
}

async function proxyTo(targetUrl: string, request: Request): Promise<Response> {
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: (() => {
      const h = new Headers(request.headers)
      h.delete('host')
      return h
    })(),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  })

  const response = await fetch(proxyRequest)
  const newHeaders = new Headers(response.headers)
  newHeaders.delete('x-frame-options')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

// Paths que son assets estáticos del storefront (no slugs de tenant).
// Cubre directorios conocidos Y cualquier archivo con extensión estática en la raíz.
const STATIC_ASSET_RE = /^\/(assets|_next|icons|images|static)(\/?.*)?$|^\/.+\.(js|css|png|jpg|jpeg|svg|ico|webp|gif|woff|woff2|ttf|eot|json|txt|xml|webmanifest|map)$/i

// El HTML que devuelve el storefront (index.html único, servido igual para cualquier
// tienda) trae meta tags genéricos de marketing de VendexChat — cuando alguien comparte
// el link de SU tienda por WhatsApp, la vista previa muestra "VendexChat" en vez del
// nombre/descripción de la tienda. Se pisan acá, en el proxy, con los datos reales de
// la tienda ya resueltos (así no depende de tocar el storefront ni de que sea SSR — los
// crawlers de WhatsApp/Facebook no ejecutan JS, necesitan los tags ya en el HTML).
class AttrRewriter {
  constructor(private attr: string, private value: string) {}
  element(el: Element) { el.setAttribute(this.attr, this.value) }
}

class TextRewriter {
  constructor(private value: string) {}
  element(el: Element) { el.setInnerContent(this.value) }
}

function rewriteMetaTags(response: Response, tenant: ResolvedTenant, requestUrl: string): Response {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return response

  const storeName = tenant.name?.trim()
  if (!storeName) return response // sin nombre no hay con qué reemplazar, se deja el HTML tal cual

  const title = `${storeName} — Pedí por WhatsApp`
  const description = tenant.description?.trim() || `Mirá el catálogo de ${storeName} y pedí directo por WhatsApp.`

  let rewriter = new HTMLRewriter()
    .on('title', new TextRewriter(title))
    .on('meta[property="og:title"]', new AttrRewriter('content', title))
    .on('meta[property="og:description"]', new AttrRewriter('content', description))
    .on('meta[property="og:url"]', new AttrRewriter('content', requestUrl))
    .on('meta[name="twitter:title"]', new AttrRewriter('content', title))
    .on('meta[name="twitter:description"]', new AttrRewriter('content', description))

  if (tenant.logoUrl) {
    rewriter = rewriter
      .on('meta[property="og:image"]', new AttrRewriter('content', tenant.logoUrl))
      .on('meta[name="twitter:image"]', new AttrRewriter('content', tenant.logoUrl))
  }

  return rewriter.transform(response)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const hostname = url.hostname

    // Health check en dominio workers.dev
    if (hostname.endsWith('workers.dev')) {
      return new Response('VendexChat Domain Proxy OK', { status: 200 })
    }

    // Assets estáticos: proxear directo al storefront sin resolver tenant.
    if (STATIC_ASSET_RE.test(url.pathname)) {
      const base = env.STOREFRONT_URL.replace(/\/$/, '')
      const targetUrl = `${base}${url.pathname}${url.search}`
      try {
        return await proxyTo(targetUrl, request)
      } catch {
        return new Response('Asset not found', { status: 404 })
      }
    }

    // Resolver tenant
    let tenant: ResolvedTenant | null = null
    try {
      tenant = await resolveTenant(hostname, url.pathname, env)
    } catch (err) {
      console.error('[domain-proxy] Error resolviendo tenant:', err)
      return new Response('Error interno del servidor', { status: 502 })
    }

    // Si no hay tenant → 404
    if (!tenant) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Proxy al storefront: vendexchat.app/<slug><remainingPath><search>
    const base = env.STOREFRONT_URL.replace(/\/$/, '')
    const targetUrl = `${base}/${tenant.slug}${tenant.remainingPath}${url.search}`

    try {
      const response = await proxyTo(targetUrl, request)
      return rewriteMetaTags(response, tenant, request.url)
    } catch (err) {
      console.error('[domain-proxy] Error proxying:', err)
      return new Response('Error al conectar con la tienda', { status: 502 })
    }
  },
}
