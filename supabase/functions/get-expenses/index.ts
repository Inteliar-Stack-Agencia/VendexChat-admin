// get-expenses — SOLO LECTURA.
//
// Gastos de una tienda por período, con su proveedor y categoría. Mismo patrón
// que las otras funciones de agente: auth por "x-agent-key" contra
// AGENT_API_KEY, Service Role Key adentro y scoping por store_id a mano.
//
// Devuelve además los totales agrupados por categoría y por proveedor, porque la
// pregunta real casi nunca es "listame los gastos" sino "en qué se nos va la
// plata" — y hacer esa cuenta del lado del cliente obligaría a traer todas las
// filas siempre.

const ALLOWED_ORIGINS = [
  "https://admin.vendexchat.app",
  "https://vendexchat.app",
  "http://localhost:5173",
];

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

const CATEGORIAS = [
  "materia_prima", "servicios", "alquiler", "personal", "transporte",
  "marketing", "merma", "consumo_interno", "bebidas", "otros",
];

interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  expense_type: string;
  amount: number;
  date: string;
  notes: string | null;
  suppliers: { name: string } | { name: string }[] | null;
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
  const supplierId = url.searchParams.get("supplier_id");
  const category = url.searchParams.get("category");
  const expenseType = url.searchParams.get("expense_type"); // fijo | variable
  const from = url.searchParams.get("from"); // YYYY-MM-DD, filtra por date
  const to = url.searchParams.get("to");
  const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!storeId || !uuidRe.test(storeId)) return jsonResponse({ error: "store_id inválido o faltante" }, 400);
  if (supplierId && !uuidRe.test(supplierId)) return jsonResponse({ error: "supplier_id inválido" }, 400);
  if (category && !CATEGORIAS.includes(category)) {
    return jsonResponse({ error: `category debe ser una de: ${CATEGORIAS.join(", ")}` }, 400);
  }
  if (expenseType && !["fijo", "variable"].includes(expenseType)) {
    return jsonResponse({ error: "expense_type debe ser 'fijo' o 'variable'" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Configuración incompleta" }, 500);

  try {
    const params = new URLSearchParams({
      select: "id,description,category,expense_type,amount,date,notes,suppliers(name)",
      store_id: `eq.${storeId}`,
      order: "date.desc",
      limit: String(limit),
    });
    if (supplierId) params.append("supplier_id", `eq.${supplierId}`);
    if (category) params.append("category", `eq.${category}`);
    if (expenseType) params.append("expense_type", `eq.${expenseType}`);
    if (from) params.append("date", `gte.${from}`);
    if (to) params.append("date", `lte.${to}`);

    const res = await fetch(`${supabaseUrl}/rest/v1/expenses?${params.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return jsonResponse({ error: `Error consultando gastos: ${err}` }, 502);
    }

    const rows = (await res.json()) as ExpenseRow[];
    const expenses = rows.map((e) => {
      const supplierJoin = Array.isArray(e.suppliers) ? e.suppliers[0] : e.suppliers;
      return {
        date: e.date,
        description: e.description,
        category: e.category,
        expense_type: e.expense_type,
        supplier_name: supplierJoin?.name || null,
        amount: Number(e.amount),
        notes: e.notes,
      };
    });

    const agrupar = (key: "category" | "supplier_name") => {
      const acc: Record<string, { gastos: number; monto: number }> = {};
      for (const e of expenses) {
        const k = (e[key] as string) || "(sin dato)";
        if (!acc[k]) acc[k] = { gastos: 0, monto: 0 };
        acc[k].gastos += 1;
        acc[k].monto += e.amount;
      }
      return acc;
    };

    return jsonResponse(
      {
        store_id: storeId,
        count: expenses.length,
        total: expenses.reduce((s, e) => s + e.amount, 0),
        por_categoria: agrupar("category"),
        por_proveedor: agrupar("supplier_name"),
        expenses,
      },
      200,
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return jsonResponse({ error: message }, 500);
  }
});
