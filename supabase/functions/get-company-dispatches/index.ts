// get-company-dispatches — SOLO LECTURA.
//
// Qué se despachó a cada empresa cliente y cuándo, con el detalle de productos.
// Mismo patrón que get-company-orders / get-company-clients: auth por header
// "x-agent-key" contra el secret AGENT_API_KEY, fetch directo a PostgREST con la
// Service Role Key, y scoping por store_id a mano en la query (no vía RLS).
//
// Diferencia importante con get-company-orders: los despachos referencian a la
// empresa por client_id contra company_clients, no por texto libre en metadata.
// Por eso acá no hace falta emparejamiento difuso — el filtro por empresa se
// resuelve contra el catálogo, que es exacto.

const ALLOWED_ORIGINS = [
  "https://admin.vendexchat.app",
  "https://vendexchat.app",
  "http://localhost:5173",
];

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

interface DispatchItemRow {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface DispatchRow {
  id: string;
  date: string;
  employee_name: string | null;
  notes: string | null;
  total: number;
  invoice_id: string | null;
  created_at: string;
  company_clients: { name: string } | { name: string }[] | null;
  company_dispatch_items: DispatchItemRow[];
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-key",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const agentKey = Deno.env.get("AGENT_API_KEY");
  if (!agentKey) return jsonResponse({ error: "AGENT_API_KEY no configurada" }, 500);
  if (req.headers.get("x-agent-key") !== agentKey) return jsonResponse({ error: "No autorizado" }, 401);

  const url = new URL(req.url);
  const storeId = url.searchParams.get("store_id") || "";
  const clientId = url.searchParams.get("client_id");
  const from = url.searchParams.get("from"); // YYYY-MM-DD
  const to = url.searchParams.get("to");
  // Un despacho sin invoice_id todavía no se facturó: es la pregunta operativa
  // más frecuente ("qué le despachamos y no le cobramos").
  const soloSinFacturar = url.searchParams.get("sin_facturar") === "true";
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!storeId || !uuidRe.test(storeId)) return jsonResponse({ error: "store_id inválido o faltante" }, 400);
  if (clientId && !uuidRe.test(clientId)) return jsonResponse({ error: "client_id inválido" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Configuración incompleta" }, 500);

  try {
    const params = new URLSearchParams({
      select: "id,date,employee_name,notes,total,invoice_id,created_at,company_clients(name),company_dispatch_items(product_name,quantity,unit_price,subtotal)",
      store_id: `eq.${storeId}`,
      order: "date.desc",
      limit: String(limit),
    });
    if (clientId) params.append("client_id", `eq.${clientId}`);
    if (from) params.append("date", `gte.${from}`);
    if (to) params.append("date", `lte.${to}`);
    if (soloSinFacturar) params.append("invoice_id", "is.null");

    const res = await fetch(`${supabaseUrl}/rest/v1/company_dispatches?${params.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return jsonResponse({ error: `Error consultando despachos: ${err}` }, 502);
    }

    const rows = (await res.json()) as DispatchRow[];
    const dispatches = rows.map((d) => {
      const clientJoin = Array.isArray(d.company_clients) ? d.company_clients[0] : d.company_clients;
      return {
        date: d.date,
        client_name: clientJoin?.name || null,
        employee_name: d.employee_name,
        total: Number(d.total),
        facturado: d.invoice_id != null,
        notes: d.notes,
        created_at: d.created_at,
        items: (d.company_dispatch_items || []).map((it) => ({
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          subtotal: Number(it.subtotal),
        })),
      };
    });

    const total = dispatches.reduce((s, d) => s + d.total, 0);
    const sinFacturar = dispatches.filter((d) => !d.facturado).reduce((s, d) => s + d.total, 0);

    return jsonResponse(
      { store_id: storeId, count: dispatches.length, total, total_sin_facturar: sinFacturar, dispatches },
      200,
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonResponse({ error: message }, 500);
  }
});
