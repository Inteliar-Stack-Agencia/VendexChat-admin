/**
 * VendexChat — Domain Proxy Worker
 *
 * Recibe requests en dominios personalizados (ej: morfiviandas.com),
 * resuelve qué tenant corresponde consultando Supabase (con caché KV),
 * y hace proxy transparente al storefront principal.
 *
 * Setup:
 *   1. Deploy este worker en Cloudflare
 *   2. Agregar ruta: *<dominio_custom>/* → este worker
 *   3. Cada tenant apunta su CNAME a servidores.vendexchat.app
 *   4. Configurar Custom Hostnames (SSL for SaaS) en el Zone de vendexchat.app
 */

export interface Env {
  /** URL base del storefront, ej: https://vendexchat.app */
  STOREFRONT_URL: string
  /** URL de Supabase, ej: https://xxxx.supabase.co */
  SUPABASE_URL: string
  /** Service role key de Supabase (secret) */
  SUPABASE_SERVICE_KEY: string
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

/** Busca el slug de una tienda por su custom_domain en Supabase */
async function resolveSlugFromSupabase(
  domain: string,
  env: Env
): Promise<string | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/stores?select=slug&custom_domain=eq.${encodeURIComponent(domain)}&is_active=eq.true&limit=1`

  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) return null

  const rows = await res.json() as { slug: string }[]
  return rows?.[0]?.slug ?? null
}

/** Resuelve domain → slug consultando Supabase */
async function resolveSlug(domain: string, env: Env): Promise<string | null> {
  return resolveSlugFromSupabase(domain, env)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const hostname = url.hostname

    // Ignorar requests al dominio workers.dev (health check, etc.)
    if (hostname.endsWith('workers.dev')) {
      return new Response('VendexChat Domain Proxy OK', { status: 200 })
    }

    // Resolver hostname → slug
    let slug: string | null = null
    try {
      slug = await resolveSlug(hostname, env)
    } catch (err) {
      console.error('[domain-proxy] Error resolviendo slug:', err)
      return new Response('Error interno del servidor', { status: 502 })
    }

    if (!slug) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // Construir URL destino: https://vendexchat.app/<slug><path><search>
    const storefrontBase = env.STOREFRONT_URL.replace(/\/$/, '')
    const targetPath = url.pathname === '/' ? '' : url.pathname
    const targetUrl = `${storefrontBase}/${slug}${targetPath}${url.search}`

    // Proxy transparente — el navegador sigue viendo el dominio del tenant
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: (() => {
        const h = new Headers(request.headers)
        h.set('X-Forwarded-Host', hostname)
        h.set('X-Original-Host', hostname)
        // No reenviar el host header para evitar loops
        h.delete('host')
        return h
      })(),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    })

    try {
      const response = await fetch(proxyRequest)

      // Reescribir headers de respuesta para que el browser no se confunda
      const newHeaders = new Headers(response.headers)
      newHeaders.delete('x-frame-options') // permitir iframes si el storefront los usa

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (err) {
      console.error('[domain-proxy] Error proxying:', err)
      return new Response('Error al conectar con la tienda', { status: 502 })
    }
  },
}
