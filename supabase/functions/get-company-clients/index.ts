// get-company-clients — SOLO LECTURA.
//
// Devuelve las empresas cliente de una tienda, con sus precios pactados por
// categoría. Mismo patrón que get-company-orders: auth por header "x-agent-key"
// contra el secret AGENT_API_KEY, fetch directo a PostgREST con la Service Role
// Key, y scoping por store_id a mano en la query (no vía RLS).
//
// Existe por dos motivos:
//
// 1. El agente CLIENTES necesita poder responder "qué empresas atendemos" y "a
//    qué precio le vendemos a cada una".
// 2. get-company-orders empareja empresas por texto difuso contra
//    metadata->>company_name, donde la misma empresa aparece escrita de varias
//    formas ("AVSA", "Argentina Valores", "Argentina Valores S.A"). Sin un
//    catálogo, un error de tipeo del operador devuelve un subconjunto de los
//    pedidos sin que nada lo indique. Esta función es ese catálogo: quien
//    interpreta la consulta puede resolver el nombre contra la lista real antes
//    de buscar, en vez de adivinar.

const ALLOWED_ORIGINS = [
  "https://admin.vendexchat.app",
  "https://vendexchat.app",
  "http://localhost:5173",
];

interface PriceRow {
  category_id: string;
  price: number;
}

interface ClientRow {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  price_mode: string | null;
  iva_rate: number | null;
  discount_percentage: number | null;
  created_at: string;
  company_client_prices: PriceRow[];
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-key",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const agentKey = Deno.env.get("AGENT_API_KEY");
  if (!agentKey) {
    return jsonResponse({ error: "AGENT_API_KEY no configurada" }, 500);
  }
  if (req.headers.get("x-agent-key") !== agentKey) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const url = new URL(req.url);
  const storeId = url.searchParams.get("store_id") || "";
  // Por defecto solo las empresas activas: el catálogo se usa para resolver
  // nombres en consultas del día a día, y una empresa dada de baja reapareciendo
  // ahí confunde más de lo que ayuda. Con include_inactive=true vienen todas.
  const includeInactive = url.searchParams.get("include_inactive") === "true";

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!storeId || !uuidRe.test(storeId)) {
    return jsonResponse({ error: "store_id inválido o faltante" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Configuración incompleta" }, 500);
  }

  try {
    const params = new URLSearchParams({
      select: "id,name,contact_name,phone,email,is_active,price_mode,iva_rate,discount_percentage,created_at,company_client_prices(category_id,price)",
      store_id: `eq.${storeId}`,
      order: "name.asc",
    });
    if (!includeInactive) params.append("is_active", "eq.true");

    const res = await fetch(`${supabaseUrl}/rest/v1/company_clients?${params.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return jsonResponse({ error: `Error consultando clientes: ${err}` }, 502);
    }

    const rows = (await res.json()) as ClientRow[];
    const clients = rows.map((c) => ({
      id: c.id,
      name: c.name,
      contact_name: c.contact_name,
      phone: c.phone,
      email: c.email,
      is_active: c.is_active,
      price_mode: c.price_mode,
      iva_rate: c.iva_rate != null ? Number(c.iva_rate) : null,
      discount_percentage: c.discount_percentage != null ? Number(c.discount_percentage) : null,
      created_at: c.created_at,
      prices_count: (c.company_client_prices || []).length,
      prices: (c.company_client_prices || []).map((p) => ({
        category_id: p.category_id,
        price: Number(p.price),
      })),
    }));

    return jsonResponse({ store_id: storeId, count: clients.length, clients }, 200);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonResponse({ error: message }, 500);
  }
});
