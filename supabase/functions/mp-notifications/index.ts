import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        console.log("Notificación MP recibida:", JSON.stringify(body))

        // 1. Verificar que sea una notificación de pago (topic o type)
        const topic = body.topic || body.type
        const id = body.data?.id || body.id

        if (topic === 'payment' || topic === 'merchant_order') {
            // Obtener detalles del pago desde MP para verificar estatus real
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: {
                    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                }
            })

            if (!mpResponse.ok) {
                console.error(`Error consultando pago ${id}:`, await mpResponse.text())
                return new Response("Error al validar pago", { status: 500 })
            }

            const payment = await mpResponse.json()
            const storeId = payment.external_reference
            const planId = payment.metadata?.plan_id

            console.log(`Pago ${id} estatus: ${payment.status} para tienda: ${storeId}`)

            if (payment.status === 'approved' && storeId) {
                // 2. Actualizar suscripción
                const { error: subError } = await supabase
                    .from("subscriptions")
                    .upsert({
                        store_id: storeId,
                        plan_type: planId || 'pro', // fallback a pro
                        status: "active",
                        current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'store_id' })

                if (subError) throw subError

                // 3. Asegurar que la tienda esté activa
                await supabase.from("stores").update({ is_active: true }).eq("id", storeId)

                console.log(`Suscripción activada/actualizada para store_id: ${storeId}`)
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })
    } catch (err: any) {
        console.error("Error en webhook:", err)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // MP recomienda devolver 200/201 siempre para evitar reintentos infinitos si el error es de lógica
        })
    }
})
