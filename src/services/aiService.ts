import { supabase } from '../supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

type PlanType = 'free' | 'pro' | 'vip' | 'ultra'

const PRO_RESTRICTIONS = `
RESTRICCIONES DE PLAN PRO (cumplir estrictamente):
- Hacé máximo 1 recomendación de producto por respuesta.
- No desarrolles argumentos extensos de venta ni múltiples razones para comprar.
- Respuestas breves y directas, sin personalización profunda.
- No uses técnicas de upselling ni cross-selling.`

export function getPlanRestrictions(plan: PlanType): string {
    if (plan === 'pro') return PRO_RESTRICTIONS
    return ''
}

export async function callAI(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    plan: PlanType = 'free'
): Promise<string> {
    const restrictions = getPlanRestrictions(plan)
    const enhancedMessages = restrictions
        ? messages.map((msg) =>
            msg.role === 'system'
                ? { ...msg, content: `${msg.content}\n${restrictions}` }
                : msg
        )
        : messages

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No hay sesión activa')

    const response = await fetch(`${SUPABASE_URL}/functions/v1/groq-proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: enhancedMessages, temperature: 0.3 }),
    })

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(err.error ?? 'Error en groq-proxy')
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
}
