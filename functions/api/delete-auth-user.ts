interface Env {
  SUPABASE_URL?: string
  VITE_SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: corsHeaders })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Faltan variables de entorno del servidor.' }, 500)
  }

  // Verify the caller is authenticated as superadmin
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'No autorizado.' }, 401)
  }

  const callerToken = authHeader.slice(7)

  // Validate caller's token and check superadmin role
  const meRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${callerToken}`,
      apikey: serviceRoleKey
    }
  })
  if (!meRes.ok) return json({ error: 'Token inválido.' }, 401)

  const callerUser = await meRes.json() as { id?: string }
  if (!callerUser?.id) return json({ error: 'Usuario no encontrado.' }, 401)

  // Check if caller is superadmin in profiles
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${callerUser.id}&select=role`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey
      }
    }
  )
  const profiles = await profileRes.json() as Array<{ role: string }>
  if (!profiles?.[0] || profiles[0].role !== 'superadmin') {
    return json({ error: 'Sin permisos de superadmin.' }, 403)
  }

  // Get user ID to delete
  let userId: string
  try {
    const body = await request.json() as { userId?: string }
    userId = body.userId || ''
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }

  if (!userId) return json({ error: 'userId requerido.' }, 400)

  // Delete from Supabase Auth using Admin API
  const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey
    }
  })

  if (!deleteRes.ok && deleteRes.status !== 404) {
    const errBody = await deleteRes.text()
    return json({ error: `Error al eliminar usuario de Auth: ${errBody}` }, deleteRes.status)
  }

  return json({ success: true })
}
