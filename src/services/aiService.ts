const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROK_MODEL = 'grok-3-mini'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

type PlanType = 'free' | 'pro' | 'vip' | 'ultra'

/**
 * Usa Grok (xAI) si hay key, sino cae a Groq como fallback
 */
export async function callAI(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    _plan: PlanType = 'free'
): Promise<string> {
    if (GROK_API_KEY) {
        return callProvider('https://api.x.ai/v1/chat/completions', GROK_API_KEY, GROK_MODEL, messages)
    }
    if (GROQ_API_KEY) {
        return callProvider('https://api.groq.com/openai/v1/chat/completions', GROQ_API_KEY, GROQ_MODEL, messages)
    }
    throw new Error('No AI API key configured. Set VITE_GROK_API_KEY or VITE_GROQ_API_KEY.')
}

async function callProvider(
    url: string,
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
): Promise<string> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
        }),
    })
    if (!response.ok) {
        const err = await response.text()
        throw new Error(`AI error: ${err}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
}
