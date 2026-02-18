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
        const { formData, planId, storeId } = await req.json()

        console.log(`Procesando pago para tienda ${storeId}, plan ${planId}`)

        // 1. Crear el pago en Mercado Pago usando los datos del Brick
        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: formData.token,
                issuer_id: formData.issuer_id,
                payment_method_id: formData.payment_method_id,
                transaction_amount: formData.transaction_amount,
                installments: formData.installments,
                payer: formData.payer,
                external_reference: storeId,
                metadata: {
                    store_id: storeId,
                    plan_id: planId
                }
            }),
        })

        const payment = await mpResponse.json()
        console.log("Respuesta MP:", payment)

        if (payment.status === "approved") {
            // 2. Actualizar suscripción en la base de datos
            const { error: subError } = await supabase
                .from("subscriptions")
                .upsert({
                    store_id: storeId,
                    plan_type: planId,
                    status: "active",
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'store_id' })

            if (subError) throw subError

            // 3. Activar tienda
            await supabase.from("stores").update({ is_active: true }).eq("id", storeId)

            return new Response(JSON.stringify({ status: "approved", id: payment.id }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            })
        } else {
            return new Response(JSON.stringify({ status: payment.status, detail: payment.status_detail }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            })
        }
    } catch (err) {
        console.error("Error procesando pago:", err)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
