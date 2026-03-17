const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'

type PlanType = 'free' | 'pro' | 'vip' | 'ultra'

// Restricciones que se inyectan en el system prompt según el plan
const PRO_RESTRICTIONS = `
RESTRICCIONES DE PLAN PRO (cumplir estrictamente):
- Hacé máximo 1 recomendación de producto por respuesta.
- No desarrolles argumentos extensos de venta ni múltiples razones para comprar.
- Respuestas breves y directas, sin personalización profunda.
- No uses técnicas de upselling ni cross-selling.`

export function getPlanRestrictions(plan: PlanType): string {
    if (plan === 'pro') return PRO_RESTRICTIONS
    return '' // VIP, Ultra: sin restricciones
}

export async function callAI(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    plan: PlanType = 'free'
): Promise<string> {
    // Inyectar restricciones de plan en el system prompt
    const restrictions = getPlanRestrictions(plan)
    const enhancedMessages = restrictions
        ? messages.map((msg) =>
            msg.role === 'system'
                ? { ...msg, content: `${msg.content}\n${restrictions}` }
                : msg
        )
        : messages

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: enhancedMessages,
            temperature: 0.3,
        }),
    })
    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Groq error: ${err}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
}
