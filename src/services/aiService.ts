const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY
const GROK_MODEL = 'grok-3-mini'

type PlanType = 'free' | 'pro' | 'vip' | 'ultra'

/**
 * Todos los planes usan Grok (xAI)
 */
export async function callAI(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    _plan: PlanType = 'free'
): Promise<string> {
    return callGrok(messages)
}

async function callGrok(
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROK_MODEL,
            messages,
            temperature: 0.3,
        }),
    })
    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Grok error: ${err}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
}
