/**
 * Called by the frontend after a new store/tenant is created.
 * Sends a Telegram notification to the superadmin.
 */
import { sendTelegramMessage } from '../lib/telegram'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing env vars' }), { status: 500 })
    }

    const body = await request.json() as {
      store_id?: string
      store_name?: string
      owner_email?: string
      plan?: string
    }

    const storeName = body.store_name || 'Desconocida'
    const ownerEmail = body.owner_email || 'N/A'
    const plan = body.plan || 'free'

    await sendTelegramMessage(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      `🏪 <b>Nueva tienda registrada</b>\n\n📌 Nombre: <b>${storeName}</b>\n📧 Email: ${ownerEmail}\n📦 Plan: ${plan}\n🕐 ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`,
      'new_store'
    )

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[store-created-notify] Error:', err)
    return new Response(JSON.stringify({ ok: false }), { status: 200 })
  }
}
