// get-company-invoices — SOLO LECTURA.
//
// Facturas emitidas a empresas cliente, con su estado de cobro. Mismo patrón que
// las otras funciones de agente: auth por "x-agent-key" contra AGENT_API_KEY,
// Service Role Key adentro y scoping por store_id a mano.
//
// El estado de una factura acá es 'facturado' o 'pagado' — no se mezclan en el
// total. Un panel que sume las dos cosas juntas muestra un número que parece
// cobrado sin serlo, que es exactamente el problema que tienen los pedidos con
// sus estados pending/confirmed/completed.

const ALLOWED_ORIGINS = [
  "https://admin.vendexchat.app",
  "https://vendexchat.app",
  "http://localhost:5173",
];

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

interface InvoiceRow {
  id: string;
  period_from: string;
  period_to: string;
  subtotal: number;
  iva_amount: number;
  total: number;
  status: string;
  invoiced_at: string;
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  notes: string | null;
  company_clients: { name: string } | { name: string }[] | null;
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
  const from = url.searchParams.get("from"); // filtra por invoiced_at
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status"); // facturado | pagado
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!storeId || !uuidRe.test(storeId)) return jsonResponse({ error: "store_id inválido o faltante" }, 400);
  if (clientId && !uuidRe.test(clientId)) return jsonResponse({ error: "client_id inválido" }, 400);
  if (status && !["facturado", "pagado"].includes(status)) {
    return jsonResponse({ error: "status debe ser 'facturado' o 'pagado'" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Configuración incompleta" }, 500);

  try {
    const params = new URLSearchParams({
      select: "id,period_from,period_to,subtotal,iva_amount,total,status,invoiced_at,paid_at,paid_amount,payment_method,notes,company_clients(name)",
      store_id: `eq.${storeId}`,
      order: "invoiced_at.desc",
      limit: String(limit),
    });
    if (clientId) params.append("client_id", `eq.${clientId}`);
    if (from) params.append("invoiced_at", `gte.${from}T00:00:00`);
    if (to) params.append("invoiced_at", `lte.${to}T23:59:59`);
    if (status) params.append("status", `eq.${status}`);

    const res = await fetch(`${supabaseUrl}/rest/v1/company_invoices?${params.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return jsonResponse({ error: `Error consultando facturas: ${err}` }, 502);
    }

    const rows = (await res.json()) as InvoiceRow[];
    const invoices = rows.map((i) => {
      const clientJoin = Array.isArray(i.company_clients) ? i.company_clients[0] : i.company_clients;
      return {
        client_name: clientJoin?.name || null,
        period_from: i.period_from,
        period_to: i.period_to,
        subtotal: Number(i.subtotal),
        iva_amount: Number(i.iva_amount),
        total: Number(i.total),
        status: i.status,
        invoiced_at: i.invoiced_at,
        paid_at: i.paid_at,
        paid_amount: i.paid_amount != null ? Number(i.paid_amount) : null,
        payment_method: i.payment_method,
        notes: i.notes,
      };
    });

    // Facturado y cobrado se informan por separado a propósito: sumarlos juntos
    // daría un número que parece ingreso y todavía no lo es.
    const facturado = invoices.reduce((s, i) => s + i.total, 0);
    const cobrado = invoices
      .filter((i) => i.status === "pagado")
      .reduce((s, i) => s + (i.paid_amount ?? i.total), 0);

    return jsonResponse(
      {
        store_id: storeId,
        count: invoices.length,
        total_facturado: facturado,
        total_cobrado: cobrado,
        pendiente_de_cobro: facturado - cobrado,
        invoices,
      },
      200,
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonResponse({ error: message }, 500);
  }
});
