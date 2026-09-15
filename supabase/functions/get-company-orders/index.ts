// get-company-orders — SOLO LECTURA.
//
// Primera herramienta de un futuro agente/orquestador: dado un store_id y el nombre
// de una empresa, devuelve los pedidos de esa empresa en un rango de fechas. No hace
// ningún insert/update/delete — es intencional, para poder exponerla a un agente sin
// riesgo de que toque datos.
//
// Mismo patrón que ya usan store-ai-chat/telegram-bot: fetch directo a PostgREST con
// la Service Role Key (no createClient de supabase-js vía jsr:, que fue la causa del
// 502 EDGE_FUNCTION_ERROR en groq-proxy) — así el scoping por store_id/empresa lo hace
// esta función a mano, no RLS.
//
// Auth: header "x-agent-key" contra el secret AGENT_API_KEY (no es un JWT de usuario
// porque un agente/orquestador externo no tiene sesión de Supabase).

const ALLOWED_ORIGINS = [
  "https://admin.vendexchat.app",
  "https://vendexchat.app",
  "http://localhost:5173",
];

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "");
}

// Empareja "AVSA" / "avsa" / "Argentina Valores" / "Argentina Valores S.A" entre sí,
// igual que matchesClient() en companyDispatchApi.ts del admin — sin depender de que
// el nombre esté tipeado exactamente igual en cada pedido.
function matchesCompany(orderCompanyName: string, query: string): boolean {
  if (!orderCompanyName || !orderCompanyName.trim()) return false;
  const orderWords = new Set(normalizeText(orderCompanyName).split(/\s+/).filter((w) => w.length >= 3));
  const queryWords = normalizeText(query).split(/\s+/).filter((w) => w.length >= 3);
  if (queryWords.length === 0) return false;
  return queryWords.some((w) => orderWords.has(w));
}

interface OrderItemRow {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_whatsapp: string;
  status: string;
  total: number;
  subtotal: number;
  customer_notes: string | null;
  payment_status: string | null;
  paid_amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  order_items: OrderItemRow[];
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
  const companyName = url.searchParams.get("company_name") || "";
  const from = url.searchParams.get("from"); // YYYY-MM-DD
  const to = url.searchParams.get("to"); // YYYY-MM-DD
  const status = url.searchParams.get("status"); // pending|confirmed|completed|cancelled
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!storeId || !uuidRe.test(storeId)) {
    return jsonResponse({ error: "store_id inválido o faltante" }, 400);
  }
  if (!companyName.trim()) {
    return jsonResponse({ error: "company_name faltante" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Configuración incompleta" }, 500);
  }

  try {
    // Se trae un lote más grande que el limit pedido (hasta 500) porque el filtro por
    // empresa se hace en JS con matching difuso sobre metadata->>company_name, que
    // PostgREST no puede normalizar del lado del servidor.
    const params = new URLSearchParams({
      select: "id,order_number,customer_name,customer_whatsapp,status,total,subtotal,customer_notes,payment_status,paid_amount,metadata,created_at,order_items(product_id,product_name,quantity,unit_price,subtotal)",
      store_id: `eq.${storeId}`,
      order: "created_at.desc",
      limit: "500",
    });
    if (from) params.append("created_at", `gte.${from}T00:00:00`);
    if (to) params.append("created_at", `lte.${to}T23:59:59`);
    if (status) params.append("status", `eq.${status}`);

    const res = await fetch(`${supabaseUrl}/rest/v1/orders?${params.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return jsonResponse({ error: `Error consultando pedidos: ${err}` }, 502);
    }

    const rows = (await res.json()) as OrderRow[];
    const matched = rows
      .filter((o) => matchesCompany((o.metadata?.company_name as string) || "", companyName))
      .slice(0, limit)
      .map((o) => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_whatsapp: o.customer_whatsapp,
        company_name: (o.metadata?.company_name as string) || null,
        status: o.status,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        payment_status: o.payment_status,
        paid_amount: o.paid_amount != null ? Number(o.paid_amount) : null,
        observaciones: o.customer_notes,
        created_at: o.created_at,
        items: (o.order_items || []).map((it) => ({
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          subtotal: Number(it.subtotal),
        })),
      }));

    return jsonResponse(
      { store_id: storeId, company_name: companyName, count: matched.length, orders: matched },
      200,
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonResponse({ error: message }, 500);
  }
});
