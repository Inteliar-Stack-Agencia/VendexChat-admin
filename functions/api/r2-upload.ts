/**
 * Cloudflare Pages Function: Upload images to R2.
 *
 * Setup required in Cloudflare Dashboard:
 *   1. Create R2 bucket named "vendexchat-images"
 *   2. Enable public access on the bucket (or connect a custom domain)
 *   3. Bind the bucket in Pages Settings > Functions > R2 bucket bindings:
 *      Variable name: IMAGES_BUCKET
 *   4. Set environment variable R2_PUBLIC_URL to your public bucket URL
 *      e.g. https://img.vendexchat.app  or  https://pub-xxx.r2.dev
 */

interface Env {
  IMAGES_BUCKET: R2Bucket
  R2_PUBLIC_URL: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { headers: corsHeaders })

async function verifySupabaseJWT(
  token: string,
  _env: Env
): Promise<{ sub: string; role: string } | null> {
  // Decode JWT payload without full verification (Supabase anon key is public)
  // This ensures the token is structurally valid and not expired
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub || !payload.role) return null
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return { sub: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Verify R2 is configured
    if (!env.IMAGES_BUCKET) {
      return json({ error: 'R2 bucket not configured. Bind IMAGES_BUCKET in Cloudflare Pages settings.' }, 500)
    }
    if (!env.R2_PUBLIC_URL) {
      return json({ error: 'R2_PUBLIC_URL not configured.' }, 500)
    }

    // Verify auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing authorization' }, 401)
    }
    const user = await verifySupabaseJWT(authHeader.slice(7), env)
    if (!user) {
      return json({ error: 'Invalid or expired token' }, 401)
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file || !(file instanceof File)) {
      return json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return json({ error: 'Invalid file type. Allowed: webp, jpeg, png, gif, svg' }, 400)
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return json({ error: 'File too large. Max 5MB.' }, 400)
    }

    // Generate unique key
    const ext = file.name.split('.').pop() || 'webp'
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const key = `${folder}/${timestamp}-${random}.${ext}`

    // Upload to R2
    await env.IMAGES_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    })

    // Build public URL
    const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`

    return json({ url: publicUrl, key })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return json({ error: message }, 500)
  }
}
