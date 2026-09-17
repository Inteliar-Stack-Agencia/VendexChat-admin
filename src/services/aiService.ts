import { supabase } from '../supabaseClient'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

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

    // "ai-proxy" (la función vieja) viene devolviendo 404 en cada llamado desde hace
    // semanas — se ve en los logs del proyecto, no depende del texto que se mande ni de
    // créditos de Groq. "groq-proxy" es una versión más nueva y más robusta del mismo
    // proxy (valida origen, cantidad/largo de mensajes, y hace su propia verificación de
    // sesión) que ya está desplegada y activa — se usa esa en su lugar.
    const { data, error } = await supabase.functions.invoke('groq-proxy', {
        body: { messages: enhancedMessages, model: GROQ_MODEL },
    })

    if (error) throw new Error(await extractFunctionErrorMessage(error))

    return data?.choices?.[0]?.message?.content ?? ''
}

// supabase.functions.invoke() no expone el cuerpo JSON del error cuando la función
// responde con un status distinto de 2xx — solo un mensaje genérico ("Edge Function
// returned a non-2xx status code"), sin importar qué haya fallado en realidad (Groq
// caído, modelo dado de baja, clave inválida, body inválido). El detalle real viaja en
// error.context, que es la Response cruda de la función — hay que leerlo a mano.
async function extractFunctionErrorMessage(error: { message: string; context?: Response }): Promise<string> {
    const ctx = error.context
    if (ctx && typeof ctx.clone === 'function') {
        try {
            const body = await ctx.clone().json()
            if (typeof body?.error === 'string' && body.error) return body.error
        } catch {
            // el cuerpo no era JSON legible — nos quedamos con error.message
        }
    }
    return error.message
}
