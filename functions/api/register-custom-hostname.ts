/**
 * Cloudflare Pages Function: Register Custom Hostname (SSL for SaaS)
 *
 * Cuando un tenant guarda su dominio personalizado, este endpoint:
 *   1. Valida el JWT del usuario
 *   2. Registra el hostname en Cloudflare via Custom Hostnames API
 *   3. Guarda el CF hostname ID en la DB para poder eliminarlo luego
 *
 * Variables de entorno requeridas (Cloudflare Pages > Settings > Variables):
 *   CF_ZONE_ID          — Zone ID del zone principal (vendexchat.app)
 *   CF_API_TOKEN        — API Token con permisos: Zone > SSL > Edit + Zone > Custom Hostnames > Edit
 *   SUPABASE_URL        — URL de Supabase
 *   SUPABASE_SERVICE_KEY — Service role key
 *
 * DELETE /api/register-custom-hostname  → elimina el hostname de CF + limpia la DB
 * POST   /api/register-custom-hostname  → registra el hostname en CF + guarda en DB
 */

interface Env {
  CF_ZONE_ID: string
  CF_API_TOKEN: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

interface CFCustomHostnameResponse {
  result: {
    id: string
    hostname: string
    ssl: {
      status: string
      validation_records?: Array<{
        txt_name: string
        txt_value: string
      }>
    }
    status: string
  }
  success: boolean
  errors: Array<{ message: string }>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

/** Verifica el JWT de Supabase y retorna el user_id */
function verifyJWT(token: string): { sub: string; role: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub) return null
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return { sub: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

/** Obtiene el store_id y datos del tenant del usuario autenticado */
async function getTenantByUserId(
  userId: string,
  env: Env
): Promise<{ id: string; slug: string; custom_hostname_cf_id: string | null } | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/stores?select=id,slug,custom_hostname_cf_id&owner_id=eq.${userId}&limit=1`
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  })
  if (!res.ok) return null
  const rows = await res.json() as Array<{ id: string; slug: string; custom_hostname_cf_id: string | null }>
  return rows?.[0] ?? null
}

/** Actualiza el store en Supabase con el CF hostname ID */
async function updateStoreCFId(
  storeId: string,
  cfId: string | null,
  env: Env
): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ custom_hostname_cf_id: cfId }),
  })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: corsHeaders })

/** POST: registra el hostname en Cloudflare */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Validar auth
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const user = verifyJWT(authHeader.slice(7))
  if (!user) return json({ error: 'Token inválido o expirado' }, 401)

  // Leer body
  const body = await request.json() as { domain?: string }
  const domain = body?.domain?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!domain) return json({ error: 'Falta el campo domain' }, 400)

  // Validación básica de dominio
  if (!/^[a-z0-9][a-z0-9\-.]{1,253}[a-z0-9]$/.test(domain)) {
    return json({ error: 'Dominio inválido' }, 400)
  }

  // Obtener tenant
  const tenant = await getTenantByUserId(user.sub, env)
  if (!tenant) return json({ error: 'Tienda no encontrada' }, 404)

  // Si ya tiene un CF hostname registrado, eliminarlo primero
  if (tenant.custom_hostname_cf_id) {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames/${tenant.custom_hostname_cf_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Registrar nuevo custom hostname en Cloudflare
  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: 'txt',
          type: 'dv',
          settings: {
            min_tls_version: '1.2',
            http2: 'on',
          },
        },
      }),
    }
  )

  const cfData = await cfRes.json() as CFCustomHostnameResponse

  if (!cfData.success) {
    const errMsg = cfData.errors?.[0]?.message ?? 'Error de Cloudflare'
    // Si el hostname ya existe en CF (otro tenant lo registró), informar
    if (errMsg.includes('already exists')) {
      return json({ error: 'Este dominio ya está registrado en otro tenant' }, 409)
    }
    return json({ error: errMsg }, 400)
  }

  // Guardar el CF hostname ID en la DB
  await updateStoreCFId(tenant.id, cfData.result.id, env)

  // Retornar info de validación para mostrar al usuario
  const validationRecord = cfData.result.ssl?.validation_records?.[0]
  return json({
    success: true,
    cf_hostname_id: cfData.result.id,
    status: cfData.result.status,
    ssl_status: cfData.result.ssl?.status,
    // Registro TXT que el usuario debe agregar en su DNS si no usa Cloudflare
    validation: validationRecord
      ? {
          type: 'TXT',
          name: validationRecord.txt_name,
          value: validationRecord.txt_value,
        }
      : null,
  })
}

/** DELETE: elimina el hostname de Cloudflare y limpia la DB */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const user = verifyJWT(authHeader.slice(7))
  if (!user) return json({ error: 'Token inválido' }, 401)

  const tenant = await getTenantByUserId(user.sub, env)
  if (!tenant) return json({ error: 'Tienda no encontrada' }, 404)

  if (tenant.custom_hostname_cf_id) {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames/${tenant.custom_hostname_cf_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )
    await updateStoreCFId(tenant.id, null, env)
  }

  return json({ success: true })
}
