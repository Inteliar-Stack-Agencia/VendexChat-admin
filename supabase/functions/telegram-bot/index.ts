import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!
const GROQ_MODEL = "llama-3.3-70b-versatile"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// In-memory conversation history per chat (cleared on function restart)
const chatHistories: Record<string, { role: string; content: string }[]> = {}

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function formatPrice(n: number): string {
    return `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
    // Telegram has a 4096 char limit per message
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > 0) {
        if (remaining.length <= 4000) {
            chunks.push(remaining)
            break
        }
        // Split at last newline before 4000 chars
        const cut = remaining.lastIndexOf("\n", 4000)
        const splitAt = cut > 2000 ? cut : 4000
        chunks.push(remaining.slice(0, splitAt))
        remaining = remaining.slice(splitAt)
    }

    for (const chunk of chunks) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: chunk,
                parse_mode: "Markdown",
            }),
        })
    }
}

async function loadStoreSnapshot(storeId: string) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch orders for 30d
    const { data: orders30d } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, customer_name, customer_whatsapp")
        .eq("store_id", storeId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200)

    const allOrders = orders30d || []
    const orders7d = allOrders.filter(o => o.created_at >= sevenDaysAgo)

    const totalSales30d = allOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const totalSales7d = orders7d.reduce((s, o) => s + (Number(o.total) || 0), 0)

    // Products
    const { data: products } = await supabase
        .from("products")
        .select("id, name, price, stock, unlimited_stock, is_active")
        .eq("store_id", storeId)
        .limit(200)

    // Customers count
    const { count: customerCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)

    // Order items for top products
    const orderIds = allOrders.map(o => o.id)
    let topProducts: { name: string; qty: number; revenue: number }[] = []
    if (orderIds.length > 0) {
        const { data: items } = await supabase
            .from("order_items")
            .select("quantity, price, products(name)")
            .in("order_id", orderIds.slice(0, 100))

        if (items) {
            const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {}
            items.forEach((item: any) => {
                const name = item.products?.name || "Sin nombre"
                if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 }
                prodMap[name].qty += Number(item.quantity) || 0
                prodMap[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0)
            })
            topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 10)
        }
    }

    // Top customers
    const custMap: Record<string, { name: string; total: number; orders: number }> = {}
    allOrders.forEach(o => {
        const key = o.customer_whatsapp || o.customer_name || "desconocido"
        if (!custMap[key]) custMap[key] = { name: o.customer_name, total: 0, orders: 0 }
        custMap[key].total += Number(o.total) || 0
        custMap[key].orders++
    })
    const topCustomers = Object.values(custMap).sort((a, b) => b.total - a.total).slice(0, 10)

    // Low stock
    const lowStock = (products || []).filter(p => !p.unlimited_stock && (p.stock ?? 0) <= 5)

    // Patterns
    const ordersByDay: Record<string, number> = {}
    const ordersByHour: Record<string, number> = {}
    allOrders.forEach(o => {
        const d = new Date(o.created_at)
        const day = DAYS_ES[d.getDay()]
        const hour = d.getHours().toString().padStart(2, "0")
        ordersByDay[day] = (ordersByDay[day] || 0) + 1
        ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
    })

    const bestDays = Object.entries(ordersByDay).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const bestHours = Object.entries(ordersByHour).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const today = now.toISOString().slice(0, 10)
    const todayOrders = allOrders.filter(o => o.created_at?.slice(0, 10) === today)

    return {
        today,
        dayOfWeek: DAYS_ES[now.getDay()],
        totalSales30d,
        totalOrders30d: allOrders.length,
        totalSales7d,
        totalOrders7d: orders7d.length,
        avgTicket: allOrders.length > 0 ? totalSales30d / allOrders.length : 0,
        todayOrdersCount: todayOrders.length,
        customerCount: customerCount || 0,
        productCount: (products || []).length,
        topCustomers,
        topProducts,
        lowStock: lowStock.map(p => ({ nombre: p.name, stock: p.stock })),
        recentOrders: allOrders.slice(0, 30).map(o => {
            const d = new Date(o.created_at)
            return {
                num: o.order_number,
                cliente: o.customer_name,
                total: o.total,
                estado: o.status,
                fecha: o.created_at?.slice(0, 10),
                hora: o.created_at?.slice(11, 16),
                dia: DAYS_ES[d.getDay()],
            }
        }),
        allProducts: (products || []).map(p => ({
            nombre: p.name,
            precio: p.price,
            stock: p.unlimited_stock ? "∞" : p.stock,
            activo: p.is_active,
        })),
        bestDays,
        bestHours,
    }
}

function buildSystemPrompt(snap: any): string {
    return `Sos el CEREBRO de inteligencia artificial de una tienda de ecommerce. Respondés consultas por Telegram de forma concisa pero completa.

CONTEXTO ACTUAL (${new Date().toLocaleString("es-AR")}):
Hoy es ${snap.dayOfWeek} ${snap.today}.

═══ MÉTRICAS CLAVE ═══
- Ventas 30d: ${formatPrice(snap.totalSales30d)} (${snap.totalOrders30d} pedidos)
- Ventas 7d: ${formatPrice(snap.totalSales7d)} (${snap.totalOrders7d} pedidos)
- Ticket promedio: ${formatPrice(snap.avgTicket)}
- Clientes totales: ${snap.customerCount}
- Pedidos hoy: ${snap.todayOrdersCount}

═══ PATRONES ═══
Días con más ventas: ${snap.bestDays.map(([d, n]: [string, number]) => `${d} (${n})`).join(", ") || "Sin datos"}
Horarios pico: ${snap.bestHours.map(([h, n]: [string, number]) => `${h}:00hs (${n})`).join(", ") || "Sin datos"}

═══ PEDIDOS RECIENTES (${snap.recentOrders.length}) ═══
${snap.recentOrders.slice(0, 20).map((o: any) => `- ${o.dia} ${o.fecha} ${o.hora} | #${o.num} | ${o.cliente} | ${formatPrice(o.total)} | ${o.estado}`).join("\n")}

═══ TOP CLIENTES ═══
${snap.topCustomers.map((c: any, i: number) => `${i + 1}. ${c.name} | ${c.orders} pedidos | ${formatPrice(c.total)}`).join("\n")}

═══ TOP PRODUCTOS ═══
${snap.topProducts.map((p: any, i: number) => `${i + 1}. ${p.name} | ${p.qty} uds | ${formatPrice(p.revenue)}`).join("\n")}

═══ CATÁLOGO (${snap.allProducts.length} productos) ═══
${snap.allProducts.slice(0, 30).map((p: any) => `- ${p.nombre} | ${formatPrice(p.precio)} | Stock: ${p.stock}`).join("\n")}

${snap.lowStock.length > 0 ? `═══ STOCK BAJO ═══\n${snap.lowStock.map((p: any) => `⚠️ ${p.nombre} | Stock: ${p.stock}`).join("\n")}` : ""}

═══ INSTRUCCIONES ═══
- Respondé en español argentino, directo y accionable
- Usá datos reales para fundamentar cada insight
- Sé conciso (es Telegram, no un reporte largo)
- Usá emojis para hacer visual
- Cuando hagas predicciones, aclará que están basadas en patrones

COMANDOS ESPECIALES que el usuario puede enviar:
/resumen - Resumen ejecutivo del día
/stock - Productos con stock bajo
/top - Top productos y clientes
/ventas - Reporte de ventas
Si el usuario envía alguno de estos, respondé directamente con la info.`
}

async function callGroq(messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.3,
        }),
    })
    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Groq error: ${err}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ""
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json()

        // ─── Handle webhook setup request from frontend ──────────────
        if (body.action === "setup-webhook") {
            const { botToken } = body
            if (!botToken) {
                return new Response(JSON.stringify({ error: "Missing botToken" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
            }

            // Resolve storeId: use body value or look up from the authenticated user's profile
            let storeId = body.storeId
            if (!storeId) {
                const authHeader = req.headers.get("Authorization") || ""
                const jwt = authHeader.replace("Bearer ", "")
                if (jwt) {
                    const { data: { user } } = await supabase.auth.getUser(jwt)
                    if (user) {
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("store_id")
                            .eq("id", user.id)
                            .single()
                        storeId = profile?.store_id || null
                    }
                }
            }

            if (!storeId) {
                return new Response(JSON.stringify({ error: "No se pudo identificar la tienda" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
            }

            const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`
            const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: webhookUrl }),
            })
            const result = await res.json()

            if (!result.ok) {
                return new Response(JSON.stringify({ error: result.description }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
            }

            // Get bot info
            const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
            const meData = await meRes.json()

            return new Response(JSON.stringify({
                ok: true,
                botUsername: meData.result?.username || null,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // ─── Handle webhook removal ─────────────────────────────────
        if (body.action === "remove-webhook") {
            const { botToken } = body
            if (botToken) {
                await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`)
            }
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // ─── Handle Telegram webhook message ────────────────────────
        const message = body.message
        if (!message?.text || !message?.chat?.id) {
            return new Response("ok", { status: 200 })
        }

        const chatId = message.chat.id
        const userText = message.text.trim()

        // Find which store this bot belongs to by looking up the token
        // The webhook URL doesn't contain store info, so we search by telegram_chat_id
        // or by scanning stores with telegram config
        const { data: stores } = await supabase
            .from("stores")
            .select("id, metadata")
            .not("metadata", "is", null)

        let storeId: string | null = null
        let botToken: string | null = null
        let allowedChatIds: number[] = []

        for (const store of (stores || [])) {
            const tgConfig = (store.metadata as any)?.telegram_bot_config
            if (tgConfig?.enabled && tgConfig?.bot_token) {
                // Check if this chat is allowed for this store
                const allowed = tgConfig.allowed_chat_ids || []
                if (allowed.length === 0 || allowed.includes(chatId)) {
                    // Verify bot token matches by checking bot info
                    storeId = store.id
                    botToken = tgConfig.bot_token
                    allowedChatIds = allowed
                    break
                }
            }
        }

        if (!storeId || !botToken) {
            // Can't identify store - ignore silently
            return new Response("ok", { status: 200 })
        }

        // Handle /start command
        if (userText === "/start") {
            await sendTelegramMessage(botToken, chatId, "🧠 *Inteligencia IA* conectada.\n\nPodés preguntarme lo que quieras sobre tu tienda. Comandos rápidos:\n/resumen - Resumen del día\n/stock - Stock bajo\n/top - Top productos y clientes\n/ventas - Reporte de ventas\n/limpiar - Borrar historial de chat")
            return new Response("ok", { status: 200 })
        }

        // Handle /limpiar
        if (userText === "/limpiar") {
            delete chatHistories[`${storeId}_${chatId}`]
            await sendTelegramMessage(botToken, chatId, "🗑 Historial de chat limpiado.")
            return new Response("ok", { status: 200 })
        }

        // Send typing indicator
        await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, action: "typing" }),
        })

        // Load store snapshot
        const snap = await loadStoreSnapshot(storeId)

        // Build conversation
        const historyKey = `${storeId}_${chatId}`
        if (!chatHistories[historyKey]) chatHistories[historyKey] = []

        // Map shortcut commands to real questions
        const commandMap: Record<string, string> = {
            "/resumen": "Dame un resumen ejecutivo de cómo va el negocio hoy",
            "/stock": "¿Qué productos tienen stock bajo?",
            "/top": "¿Cuáles son los top productos y top clientes?",
            "/ventas": "Dame un reporte de ventas de la última semana con tendencia",
        }
        const query = commandMap[userText] || userText

        chatHistories[historyKey].push({ role: "user", content: query })

        // Keep only last 10 messages
        if (chatHistories[historyKey].length > 10) {
            chatHistories[historyKey] = chatHistories[historyKey].slice(-10)
        }

        const systemPrompt = buildSystemPrompt(snap)
        const aiMessages = [
            { role: "system", content: systemPrompt },
            ...chatHistories[historyKey],
        ]

        const aiResponse = await callGroq(aiMessages)
        chatHistories[historyKey].push({ role: "assistant", content: aiResponse })

        await sendTelegramMessage(botToken, chatId, aiResponse)

        return new Response("ok", { status: 200 })
    } catch (err) {
        console.error("Telegram bot error:", err)
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
})
