/**
 * Test endpoint: sends a test Telegram message using the provided credentials.
 * Called from the superadmin settings UI to verify bot configuration.
 */
import { sendTelegramTestMessage } from '../lib/telegram'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  try {
    const body = await request.json() as { bot_token?: string; chat_id?: string }

    if (!body.bot_token || !body.chat_id) {
      return new Response(JSON.stringify({ ok: false, description: 'bot_token y chat_id son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await sendTelegramTestMessage(body.bot_token, body.chat_id)

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[test-telegram] Error:', err)
    return new Response(JSON.stringify({ ok: false, description: 'Error interno' }), { status: 500 })
  }
}
