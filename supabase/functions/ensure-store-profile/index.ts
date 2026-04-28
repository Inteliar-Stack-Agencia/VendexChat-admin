import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: { user }, error: userError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const { store_name, slug, country, city } = await req.json()

    // Si el perfil ya tiene store_id, no hay nada que hacer
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, store_id")
      .eq("id", user.id)
      .maybeSingle()

    if (existingProfile?.store_id) {
      return new Response(
        JSON.stringify({ success: true, store_id: existingProfile.store_id, created: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Resolver slug con fallback a parte del email
    const baseSlug = (slug || user.email?.split("@")[0] || "tienda")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    let finalSlug = baseSlug
    let attempt = 0

    while (true) {
      const { data: existing } = await adminClient
        .from("stores")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle()

      if (!existing) break

      attempt++
      finalSlug = attempt > 5
        ? `${baseSlug}-${Math.floor(Math.random() * 9000) + 1000}`
        : `${baseSlug}-${attempt}`

      if (attempt > 5) break
    }

    // Crear la tienda
    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .insert({
        name: store_name || user.email?.split("@")[0] || "Mi Tienda",
        slug: finalSlug,
        email: user.email,
        whatsapp: "",
        country: country || "Argentina",
        city: city || "",
        owner_id: user.id,
        is_active: false,
      })
      .select("id")
      .single()

    if (storeError) throw new Error(`Error al crear tienda: ${storeError.message}`)

    const role = (user.user_metadata as Record<string, string>)?.role || "client"

    // Crear o actualizar perfil
    if (existingProfile) {
      await adminClient
        .from("profiles")
        .update({ store_id: store.id })
        .eq("id", user.id)
    } else {
      await adminClient
        .from("profiles")
        .upsert({ id: user.id, email: user.email, role, store_id: store.id })
    }

    return new Response(
      JSON.stringify({ success: true, store_id: store.id, created: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("[ensure-store-profile]", err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
