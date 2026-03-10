const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'

type PlanType = 'free' | 'pro' | 'vip' | 'ultra'

/**
 * Llama a la IA según el plan del usuario:
 * - free / pro  → Pollinations (sin key, modelo openai)
 * - vip / ultra → Groq (llama-3.3-70b-versatile, más rápido y confiable)
 */
export async function callAI(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    plan: PlanType = 'free'
): Promise<string> {
    if (plan === 'vip' || plan === 'ultra') {
        return callGroq(messages)
    }
    return callPollinations(messages)
}

async function callGroq(
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
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

async function callPollinations(
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: 'openai' }),
    })
    if (!response.ok) throw new Error('Error en IA')
    return response.text()
}
