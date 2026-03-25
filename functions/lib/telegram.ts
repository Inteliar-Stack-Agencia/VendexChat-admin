/**
 * Shared Telegram notification helper for VENDExChat edge functions.
 * Reads bot token and chat ID from Supabase global_settings at runtime,
 * so the superadmin can configure them from the UI without redeployment.
 */

interface TelegramConfig {
  botToken: string
  chatId: string
  enabled: boolean
  notifyPayments: boolean
  notifySubscriptions: boolean
  notifyNewStores: boolean
}

async function getTelegramConfig(supabaseUrl: string, supabaseServiceKey: string): Promise<TelegramConfig> {
  const keys = [
    'telegram_bot_token',
    'telegram_chat_id',
    'telegram_notifications_enabled',
    'telegram_notify_payments',
    'telegram_notify_subscriptions',
    'telegram_notify_new_stores',
  ]

  const res = await fetch(
    `${supabaseUrl}/rest/v1/global_settings?key=in.(${keys.map(k => `"${k}"`).join(',')})&select=key,value`,
    {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        Accept: 'application/json',
      },
    }
  )

  if (!res.ok) return { botToken: '', chatId: '', enabled: false, notifyPayments: true, notifySubscriptions: true, notifyNewStores: true }

  const rows = await res.json() as Array<{ key: string; value: unknown }>
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    map[row.key] = row.value
  }

  return {
    botToken: String(map['telegram_bot_token'] ?? '').replace(/^"|"$/g, ''),
    chatId: String(map['telegram_chat_id'] ?? '').replace(/^"|"$/g, ''),
    enabled: map['telegram_notifications_enabled'] === true || map['telegram_notifications_enabled'] === 'true',
    notifyPayments: map['telegram_notify_payments'] !== false && map['telegram_notify_payments'] !== 'false',
    notifySubscriptions: map['telegram_notify_subscriptions'] !== false && map['telegram_notify_subscriptions'] !== 'false',
    notifyNewStores: map['telegram_notify_new_stores'] !== false && map['telegram_notify_new_stores'] !== 'false',
  }
}

export async function sendTelegramMessage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  message: string,
  category: 'payment' | 'subscription' | 'new_store' = 'payment'
): Promise<void> {
  try {
    const config = await getTelegramConfig(supabaseUrl, supabaseServiceKey)

    if (!config.enabled || !config.botToken || !config.chatId) return

    if (category === 'payment' && !config.notifyPayments) return
    if (category === 'subscription' && !config.notifySubscriptions) return
    if (category === 'new_store' && !config.notifyNewStores) return

    await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    // Never throw — notifications are best-effort and must not break the main flow
    console.error('[telegram] Failed to send notification:', err)
  }
}

export async function sendTelegramTestMessage(
  botToken: string,
  chatId: string
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: '✅ <b>VENDExChat Admin</b>\n\nConexión verificada exitosamente. Las notificaciones de Telegram están activas.',
      parse_mode: 'HTML',
    }),
  })
  const data = await res.json() as { ok: boolean; description?: string }
  return data
}
