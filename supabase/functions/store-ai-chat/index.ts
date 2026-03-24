import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PLAN_CONFIG: Record<string, { model: string; maxTokens: number }> = {
  pro:   { model: "llama-3.1-8b-instant",    maxTokens: 500  },
  vip:   { model: "llama-3.3-70b-versatile", maxTokens: 1500 },
  ultra: { model: "llama-3.3-70b-versatile", maxTokens: 2000 },
};

const DEFAULT_CONFIG = { model: "llama-3.1-8b-instant", maxTokens: 300 };

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface BotConfig {
  enabled: boolean;
  name: string;
  personality: "friendly" | "formal" | "concise";
  greeting: string;
  faqs: FAQ[];
}

async function getStoreData(storeId: string): Promise<{
  planConfig: { model: string; maxTokens: number };
  systemPrompt: string;
  greeting: string;
  botName: string;
}> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey || !storeId) {
    return {
      planConfig: DEFAULT_CONFIG,
      systemPrompt: "Sos un asistente de ventas amigable.",
      greeting: "¡Hola! 👋 ¿En qué puedo ayudarte hoy?",
      botName: "Asistente",
    };
  }

  try {
    // Load store data and subscription in parallel
    const [storeRes, subRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/stores?id=eq.${storeId}&select=name,metadata&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/subscriptions?store_id=eq.${storeId}&status=eq.active&select=plan_type&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      ),
    ]);

    const stores = storeRes.ok ? await storeRes.json() : [];
    const subs   = subRes.ok  ? await subRes.json()   : [];

    const store        = stores?.[0];
    const plan: string = subs?.[0]?.plan_type ?? "";
    const planConfig   = PLAN_CONFIG[plan] ?? DEFAULT_CONFIG;

    const storeName: string = store?.name ?? "la tienda";
    const metadata   = store?.metadata ?? {};
    const botConfig  = (metadata.bot_config ?? {}) as Partial<BotConfig>;
    const aiPrompt   = String(metadata.ai_prompt ?? metadata.catalog_instructions ?? "");

    const personality = botConfig.personality ?? "friendly";
    const personalityMap: Record<string, string> = {
      friendly: "amigable, cálido, usa emojis con moderación, tutea al cliente",
      formal:   "profesional y cortés, usa usted, no usa emojis",
      concise:  "muy conciso, respuestas de máximo 2 oraciones, sin adornos",
    };

    const faqs: FAQ[] = botConfig.faqs ?? [];
    const faqsText = faqs.length > 0
      ? `\n\nRESPUESTAS PREDEFINIDAS (úsalas cuando el cliente haga estas preguntas):\n${faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n")}`
      : "";

    const systemPrompt =
      `Eres el asistente virtual de "${storeName}". Eres ${personalityMap[personality] ?? personalityMap.friendly}.\n` +
      `Tu misión es ayudar a los clientes con preguntas sobre el catálogo, precios, horarios y pedidos.\n` +
      (aiPrompt ? `\nINSTRUCCIONES ADICIONALES DE LA TIENDA:\n${aiPrompt}` : "") +
      faqsText +
      `\nSi no sabes algo, sé honesto y ofrece que un humano responderá pronto.\nResponde siempre en español.`;

    const greeting = botConfig.greeting?.trim()
      || `¡Hola! 👋 Soy el asistente virtual de ${storeName}. ¿En qué puedo ayudarte hoy?`;

    const botName = botConfig.name?.trim() || "Asistente";

    return { planConfig, systemPrompt, greeting, botName };
  } catch {
    return {
      planConfig: DEFAULT_CONFIG,
      systemPrompt: "Sos un asistente de ventas amigable.",
      greeting: "¡Hola! 👋 ¿En qué puedo ayudarte hoy?",
      botName: "Asistente",
    };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET ?storeId=xxx  ->  returns { greeting, botName } for widget init
  if (req.method === "GET") {
    const storeId = url.searchParams.get("storeId") ?? "";
    const data = await getStoreData(storeId);
    return new Response(
      JSON.stringify({ greeting: data.greeting, botName: data.botName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { messages, storeId } = body;
    // Accept legacy systemPrompt from store frontend as fallback
    const legacySystemPrompt: string | undefined = body.systemPrompt;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    let systemPrompt = legacySystemPrompt ?? "Sos un asistente de ventas amigable.";
    let planConfig   = DEFAULT_CONFIG;

    if (storeId) {
      const data  = await getStoreData(storeId);
      systemPrompt = data.systemPrompt;
      planConfig   = data.planConfig;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: planConfig.model,
        max_tokens: planConfig.maxTokens,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq error: ${err}`);
    }

    const data  = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "No pude procesar tu mensaje, probá de nuevo.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("store-ai-chat error:", err);
    return new Response(
      JSON.stringify({ reply: "Uy, algo falló. ¿Podés intentar de nuevo? Si el problema sigue, escribínos por WhatsApp." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
