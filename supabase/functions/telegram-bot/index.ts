import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!
const GROQ_MODEL = "llama-3.3-70b-versatile"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// In-memory conversation history + pending actions per chat
const chatHistories: Record<string, { role: string; content: string }[]> = {}
const pendingActions: Record<string, AIAction[]> = {}

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function formatPrice(n: number): string {
    return `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

interface AIAction {
    type: "update_order_status" | "update_product_stock" | "update_product_price" | "update_product_active"
    order_id?: string
    order_number?: string
    new_status?: string
    product_id?: string
    product_name?: string
    new_stock?: number
    new_price?: number
    is_active?: boolean
    reason?: string
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > 0) {
        if (remaining.length <= 4000) { chunks.push(remaining); break }
        const cut = remaining.lastIndexOf("\n", 4000)
        const splitAt = cut > 2000 ? cut : 4000
        chunks.push(remaining.slice(0, splitAt))
        remaining = remaining.slice(splitAt)
    }
    for (const chunk of chunks) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "Markdown" }),
        })
    }
}

async function loadStoreSnapshot(storeId: string) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders30d } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, customer_name, customer_whatsapp, delivery_type, metadata")
        .eq("store_id", storeId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200)

    const allOrders = orders30d || []
    const orders7d = allOrders.filter(o => o.created_at >= sevenDaysAgo)
    const today = now.toISOString().slice(0, 10)
    const todayOrders = allOrders.filter(o => o.created_at?.slice(0, 10) === today)

    const totalSales30d = allOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const totalSales7d = orders7d.reduce((s, o) => s + (Number(o.total) || 0), 0)

    // Categories map
    const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .eq("store_id", storeId)
    const categoriesMap: Record<string, string> = {}
    ;(categoriesData || []).forEach((c: any) => { categoriesMap[c.id] = c.name })

    // Products with category_id
    const { data: products } = await supabase
        .from("products")
        .select("id, name, description, price, stock, unlimited_stock, is_active, category_id")
        .eq("store_id", storeId)
        .limit(300)

    // Customers
    const { count: customerCount } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)

    // Top customers in 7d
    const { data: recentCustomers } = await supabase
        .from("customers")
        .select("id, name, whatsapp, total_spent, orders_count, last_order_at")
        .eq("store_id", storeId)
        .order("total_spent", { ascending: false })
        .limit(10)

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
    const lowStock = (products || []).filter(p => !p.unlimited_stock && (p.stock ?? 0) <= 5)

    // Sales by status
    const pending = allOrders.filter(o => o.status === "pending")
    const confirmed = allOrders.filter(o => o.status === "confirmed")
    const completed = allOrders.filter(o => o.status === "completed")
    const cancelled = allOrders.filter(o => o.status === "cancelled")

    // Store config
    const { data: store } = await supabase
        .from("stores")
        .select("accept_orders, min_order, delivery_cost, delivery_info, coupons_enabled, low_stock_threshold, physical_schedule, online_schedule, metadata")
        .eq("id", storeId)
        .single()

    // Active coupons
    const { data: coupons } = await supabase
        .from("coupons")
        .select("code, type, value, end_date, usage_limit, usage_count, min_purchase_amount, is_active")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .limit(20)

    // Active gateways
    const { data: gateways } = await supabase
        .from("gateways")
        .select("provider, is_active, is_master")
        .eq("store_id", storeId)
        .eq("is_active", true)

    return {
        today,
        dayOfWeek: DAYS_ES[now.getDay()],
        totalSales30d,
        totalOrders30d: allOrders.length,
        totalSales7d,
        totalOrders7d: orders7d.length,
        avgTicket: allOrders.length > 0 ? totalSales30d / allOrders.length : 0,
        todayOrdersCount: todayOrders.length,
        todaySales: todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
        customerCount: customerCount || 0,
        productCount: (products || []).length,
        topCustomers: (recentCustomers || []).map(c => ({ name: c.name, whatsapp: c.whatsapp, total: c.total_spent, orders: c.orders_count })),
        topProducts,
        lowStock: lowStock.map(p => ({ id: p.id, nombre: p.name, stock: p.stock })),
        recentOrders: allOrders.slice(0, 30).map(o => ({
            id: o.id,
            num: o.order_number,
            cliente: o.customer_name,
            total: o.total,
            estado: o.status,
            fecha: o.created_at?.slice(0, 10),
            hora: o.created_at?.slice(11, 16),
            dia: DAYS_ES[new Date(o.created_at).getDay()],
            delivery: o.delivery_type,
        })),
        allProducts: (products || []).map(p => ({
            id: p.id,
            nombre: p.name,
            categoria: categoriesMap[(p as any).category_id] || "Sin categoría",
            descripcion: (p as any).description ? (p as any).description.slice(0, 60) : "",
            precio: p.price,
            stock: p.unlimited_stock ? "∞" : p.stock,
            activo: p.is_active,
        })),
        categories: Object.values(categoriesMap),
        storeConfig: {
            acceptOrders: store?.accept_orders ?? true,
            minOrder: store?.min_order ?? 0,
            deliveryCost: store?.delivery_cost ?? 0,
            deliveryInfo: store?.delivery_info ?? "",
            couponsEnabled: store?.coupons_enabled ?? false,
            lowStockThreshold: store?.low_stock_threshold ?? 5,
            deliveryMode: (store?.metadata as any)?.delivery_mode ?? "delivery",
            estimatedTime: (store?.metadata as any)?.estimated_time ?? "",
            deliveryZones: (store?.metadata as any)?.delivery_zones ?? [],
            paymentMethods: (store?.metadata as any)?.payment_methods ?? {},
            physicalSchedule: store?.physical_schedule ?? null,
            onlineSchedule: store?.online_schedule ?? null,
        },
        coupons: (coupons || []).map((c: any) => ({
            code: c.code,
            tipo: c.type,
            valor: c.value,
            vence: c.end_date?.slice(0, 10) ?? "sin vencimiento",
            usos: `${c.usage_count}/${c.usage_limit ?? "∞"}`,
            minCompra: c.min_purchase_amount ?? 0,
        })),
        gateways: (gateways || []).map((g: any) => g.provider),
        ordersByStatus: {
            pending: pending.length,
            confirmed: confirmed.length,
            completed: completed.length,
            cancelled: cancelled.length,
        },
        bestDays,
        bestHours,
    }
}

function buildSystemPrompt(snap: any): string {
    return `Sos el CEREBRO de inteligencia artificial de una tienda de ecommerce. Respondés consultas por Telegram de forma concisa pero completa.

CONTEXTO ACTUAL (${new Date().toLocaleString("es-AR")}):
Hoy es ${snap.dayOfWeek} ${snap.today}.

═══ MÉTRICAS CLAVE ═══
- Ventas hoy: ${formatPrice(snap.todaySales)} (${snap.todayOrdersCount} pedidos)
- Ventas 7d: ${formatPrice(snap.totalSales7d)} (${snap.totalOrders7d} pedidos)
- Ventas 30d: ${formatPrice(snap.totalSales30d)} (${snap.totalOrders30d} pedidos)
- Ticket promedio: ${formatPrice(snap.avgTicket)}
- Clientes totales: ${snap.customerCount}
- Productos en catálogo: ${snap.productCount}

═══ PEDIDOS POR ESTADO (últimos 30d) ═══
- Pendientes: ${snap.ordersByStatus.pending}
- Confirmados: ${snap.ordersByStatus.confirmed}
- Completados: ${snap.ordersByStatus.completed}
- Cancelados: ${snap.ordersByStatus.cancelled}

═══ PATRONES ═══
Días con más ventas: ${snap.bestDays.map(([d, n]: [string, number]) => `${d} (${n})`).join(", ") || "Sin datos"}
Horarios pico: ${snap.bestHours.map(([h, n]: [string, number]) => `${h}:00hs (${n})`).join(", ") || "Sin datos"}

═══ PEDIDOS RECIENTES (${snap.recentOrders.length}) ═══
${snap.recentOrders.slice(0, 20).map((o: any) => `- [ID:${o.id}] ${o.dia} ${o.fecha} ${o.hora} | #${o.num} | ${o.cliente} | ${formatPrice(o.total)} | ${o.estado} | ${o.delivery}`).join("\n")}

═══ TOP CLIENTES ═══
${snap.topCustomers.map((c: any, i: number) => `${i + 1}. ${c.name}${c.whatsapp ? ` (${c.whatsapp})` : ""} | ${c.orders} pedidos | ${formatPrice(c.total)}`).join("\n")}

═══ TOP PRODUCTOS ═══
${snap.topProducts.map((p: any, i: number) => `${i + 1}. ${p.name} | ${p.qty} uds | ${formatPrice(p.revenue)}`).join("\n")}

═══ CATEGORÍAS (${snap.categories.length}) ═══
${snap.categories.join(", ")}

═══ CATÁLOGO COMPLETO (${snap.allProducts.length} productos) ═══
${snap.allProducts.map((p: any) => `- [ID:${p.id}] [${p.categoria}] ${p.nombre}${p.descripcion ? ` — ${p.descripcion}` : ""} | ${formatPrice(p.precio)} | Stock: ${p.stock} | ${p.activo ? "✅" : "⏸️"}`).join("\n")}

${snap.lowStock.length > 0 ? `═══ STOCK BAJO (≤5) ═══\n${snap.lowStock.map((p: any) => `⚠️ [ID:${p.id}] ${p.nombre} | Stock: ${p.stock}`).join("\n")}` : ""}

═══ CAPACIDADES ═══
Podés analizar: ventas, pedidos, clientes, stock, precios, categorías, logística, tendencias, predicciones, horarios óptimos, rentabilidad.
Podés gestionar: cambiar estado de pedidos, actualizar stock, cambiar precios, activar/pausar productos.

═══ ACCIONES DE GESTIÓN ═══
Cuando el usuario pida EJECUTAR cambios, incluí al final de tu respuesta los comandos así (el usuario deberá confirmar con SI):

Para cambiar estado de pedido (estados: pending, confirmed, completed, cancelled):
[[ACTION:{"type":"update_order_status","order_id":"ID_COMPLETO","order_number":"NUM","new_status":"completed","reason":"motivo"}]]

Para actualizar stock:
[[ACTION:{"type":"update_product_stock","product_id":"ID","product_name":"NOMBRE","new_stock":10}]]

Para cambiar precio:
[[ACTION:{"type":"update_product_price","product_id":"ID","product_name":"NOMBRE","new_price":1500}]]

Para activar/pausar producto:
[[ACTION:{"type":"update_product_active","product_id":"ID","product_name":"NOMBRE","is_active":false}]]

REGLAS: Usá los IDs exactos del catálogo. Solo incluí acciones cuando el usuario pida ejecutar cambios. Para análisis no incluyas acciones.

═══ CONFIGURACIÓN DE LA TIENDA ═══
- Acepta pedidos: ${snap.storeConfig.acceptOrders ? "✅ Sí" : "❌ No"}
- Pedido mínimo: ${formatPrice(snap.storeConfig.minOrder)}
- Costo delivery base: ${formatPrice(snap.storeConfig.deliveryCost)}
- Info delivery: ${snap.storeConfig.deliveryInfo || "No especificada"}
- Modo entrega: ${snap.storeConfig.deliveryMode}
- Tiempo estimado: ${snap.storeConfig.estimatedTime || "No especificado"}
- Cupones habilitados: ${snap.storeConfig.couponsEnabled ? "✅ Sí" : "❌ No"}
- Umbral stock bajo: ${snap.storeConfig.lowStockThreshold} uds
${snap.storeConfig.deliveryZones.length > 0 ? `- Zonas delivery: ${snap.storeConfig.deliveryZones.filter((z: any) => z.is_active).map((z: any) => `${z.name} (${formatPrice(z.cost)})`).join(", ")}` : ""}
${snap.gateways.length > 0 ? `- Pasarelas de pago: ${snap.gateways.join(", ")}` : ""}
${Object.keys(snap.storeConfig.paymentMethods).filter(k => snap.storeConfig.paymentMethods[k]).length > 0 ? `- Métodos de pago: ${Object.keys(snap.storeConfig.paymentMethods).filter(k => snap.storeConfig.paymentMethods[k]).join(", ")}` : ""}

${snap.storeConfig.onlineSchedule ? `═══ HORARIO TIENDA ONLINE ═══
${Object.entries(snap.storeConfig.onlineSchedule).map(([day, s]: [string, any]) =>
    s.open ? `${day}: ${s.intervals?.map((i: any) => `${i.start}-${i.end}`).join(", ")}` : `${day}: Cerrado`
).join("\n")}` : ""}

${snap.coupons.length > 0 ? `═══ CUPONES ACTIVOS (${snap.coupons.length}) ═══
${snap.coupons.map((c: any) => `- ${c.code} | Tipo ${c.tipo} | Valor: ${c.valor} | Vence: ${c.vence} | Usos: ${c.usos}${c.minCompra > 0 ? ` | Mínimo: ${formatPrice(c.minCompra)}` : ""}`).join("\n")}` : ""}

═══ INSTRUCCIONES ═══
- Respondé en español argentino, conciso (es Telegram)
- Usá emojis para hacer visual
- Usá datos reales para fundamentar
- Cuando hagas predicciones, aclará que son basadas en patrones
- Si el usuario pregunta algo para lo que NO tenés datos suficientes en este contexto, respondé lo mejor que puedas Y al final incluí: [[UNKNOWN:pregunta del usuario]]`
}

function parseActions(text: string): { cleanText: string; actions: AIAction[]; unknownQuestions: string[] } {
    const actionRegex = /\[\[ACTION:(.*?)\]\]/g
    const unknownRegex = /\[\[UNKNOWN:(.*?)\]\]/g
    const actions: AIAction[] = []
    const unknownQuestions: string[] = []
    let match
    while ((match = actionRegex.exec(text)) !== null) {
        try { actions.push(JSON.parse(match[1]) as AIAction) } catch { /* ignore */ }
    }
    while ((match = unknownRegex.exec(text)) !== null) {
        if (match[1]?.trim()) unknownQuestions.push(match[1].trim())
    }
    const cleanText = text
        .replace(/\[\[ACTION:.*?\]\]/g, "")
        .replace(/\[\[UNKNOWN:.*?\]\]/g, "")
        .replace(/\n{3,}/g, "\n\n").trim()
    return { cleanText, actions, unknownQuestions }
}

async function saveFeedback(storeId: string, chatId: number, username: string | undefined, questions: string[], botContext: string) {
    for (const question of questions) {
        await supabase.from("bot_feedback").insert({
            store_id: storeId,
            chat_id: chatId,
            username: username ?? null,
            question,
            bot_context: botContext.slice(0, 500),
        })
    }
}

function describeAction(a: AIAction): string {
    if (a.type === "update_order_status") return `Pedido #${a.order_number} → *${a.new_status}*${a.reason ? ` (${a.reason})` : ""}`
    if (a.type === "update_product_stock") return `Stock de *${a.product_name}* → *${a.new_stock} uds*`
    if (a.type === "update_product_price") return `Precio de *${a.product_name}* → *${formatPrice(a.new_price ?? 0)}*`
    if (a.type === "update_product_active") return `*${a.product_name}* → ${a.is_active ? "✅ Activar" : "⏸️ Pausar"}`
    return "Acción desconocida"
}

async function executeActions(actions: AIAction[]): Promise<{ ok: number; fail: number }> {
    let ok = 0, fail = 0
    for (const action of actions) {
        try {
            if (action.type === "update_order_status" && action.order_id && action.new_status) {
                await supabase.from("orders").update({ status: action.new_status }).eq("id", action.order_id)
                ok++
            } else if (action.type === "update_product_stock" && action.product_id && action.new_stock !== undefined) {
                await supabase.from("products").update({ stock: action.new_stock }).eq("id", action.product_id)
                ok++
            } else if (action.type === "update_product_price" && action.product_id && action.new_price !== undefined) {
                await supabase.from("products").update({ price: action.new_price }).eq("id", action.product_id)
                ok++
            } else if (action.type === "update_product_active" && action.product_id && action.is_active !== undefined) {
                await supabase.from("products").update({ is_active: action.is_active }).eq("id", action.product_id)
                ok++
            }
        } catch (err) {
            console.error("Error ejecutando acción:", action, err)
            fail++
        }
    }
    return { ok, fail }
}

async function callGroq(messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.3 }),
    })
    if (!response.ok) throw new Error(`Groq error: ${await response.text()}`)
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ""
}

const HELP_TEXT = `🧠 *Inteligencia IA — Comandos disponibles*

*📊 Análisis*
/resumen — Resumen ejecutivo del día
/hoy — Pedidos y ventas de hoy
/ventas — Reporte de ventas 7d y 30d
/tendencia — Tendencia y predicción de demanda
/horarios — Mejor horario para publicar

*📦 Productos*
/stock — Productos con stock bajo
/catalogo — Catálogo completo
/top — Top productos más vendidos
/inactivos — Productos pausados
/categoria [nombre] — Productos de una categoría

*🛒 Pedidos*
/pedidos — Pedidos de hoy
/pendientes — Pedidos pendientes
/buscar [#numero] — Buscar un pedido

*👥 Clientes*
/clientes — Top 10 mejores clientes
/cliente [nombre] — Info de un cliente

*⚡ Gestión (requiere confirmación)*
/pausar [producto] — Pausar un producto
/activar [producto] — Activar un producto
/precio [producto] [nuevo precio] — Cambiar precio
/stockset [producto] [cantidad] — Actualizar stock
/completar [#numero pedido] — Marcar pedido como completado
/cancelar [#numero pedido] — Cancelar un pedido

*🛠️ Otros*
/ayuda — Este menú
/limpiar — Borrar historial de chat

O simplemente escribime lo que necesitás en lenguaje natural 💬`

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    try {
        const body = await req.json()

        // ─── Webhook setup ───────────────────────────────────────────
        if (body.action === "setup-webhook") {
            const { botToken } = body
            if (!botToken) return new Response(JSON.stringify({ error: "Missing botToken" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

            let storeId = body.storeId
            if (!storeId) {
                const authHeader = req.headers.get("Authorization") || ""
                const jwt = authHeader.replace("Bearer ", "")
                if (jwt) {
                    const { data: { user } } = await supabase.auth.getUser(jwt)
                    if (user) {
                        const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).single()
                        storeId = profile?.store_id || null
                    }
                }
            }
            if (!storeId) return new Response(JSON.stringify({ error: "No se pudo identificar la tienda" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

            const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`
            const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: webhookUrl }),
            })
            const result = await res.json()
            if (!result.ok) return new Response(JSON.stringify({ error: result.description }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

            const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
            const meData = await meRes.json()
            return new Response(JSON.stringify({ ok: true, botUsername: meData.result?.username || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        // ─── Webhook removal ─────────────────────────────────────────
        if (body.action === "remove-webhook") {
            const { botToken } = body
            if (botToken) await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`)
            return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        // ─── Telegram webhook message ────────────────────────────────
        const message = body.message
        if (!message?.text || !message?.chat?.id) return new Response("ok", { status: 200 })

        const chatId = message.chat.id
        const userText = message.text.trim()

        // Find store by token
        const { data: stores } = await supabase.from("stores").select("id, metadata").not("metadata", "is", null)
        let storeId: string | null = null
        let botToken: string | null = null

        for (const store of (stores || [])) {
            const tgConfig = (store.metadata as any)?.telegram_bot_config
            if (tgConfig?.enabled && tgConfig?.bot_token) {
                const allowed = tgConfig.allowed_chat_ids || []
                if (allowed.length === 0 || allowed.includes(chatId)) {
                    storeId = store.id
                    botToken = tgConfig.bot_token
                    break
                }
            }
        }

        if (!storeId || !botToken) return new Response("ok", { status: 200 })

        const historyKey = `${storeId}_${chatId}`

        // ─── /start ──────────────────────────────────────────────────
        if (userText === "/start") {
            await sendTelegramMessage(botToken, chatId, "🧠 *Inteligencia IA* conectada.\n\nPodés preguntarme cualquier cosa sobre tu tienda o usar los comandos.\n\nEscribí /ayuda para ver todo lo que puedo hacer.")
            return new Response("ok", { status: 200 })
        }

        // ─── /ayuda ──────────────────────────────────────────────────
        if (userText === "/ayuda" || userText === "/help") {
            await sendTelegramMessage(botToken, chatId, HELP_TEXT)
            return new Response("ok", { status: 200 })
        }

        // ─── /limpiar ────────────────────────────────────────────────
        if (userText === "/limpiar") {
            delete chatHistories[historyKey]
            delete pendingActions[historyKey]
            await sendTelegramMessage(botToken, chatId, "🗑 Historial y acciones pendientes limpiados.")
            return new Response("ok", { status: 200 })
        }

        // ─── Confirmación de acciones pendientes (SI/NO) ─────────────
        const normalized = userText.toLowerCase().trim()
        if (pendingActions[historyKey]?.length > 0) {
            if (normalized === "si" || normalized === "sí" || normalized === "s") {
                const actions = pendingActions[historyKey]
                delete pendingActions[historyKey]
                await sendTelegramMessage(botToken, chatId, "⏳ Ejecutando...")
                const { ok, fail } = await executeActions(actions)
                const msg = ok > 0
                    ? `✅ ${ok} acción${ok > 1 ? "es" : ""} ejecutada${ok > 1 ? "s" : ""} correctamente.${fail > 0 ? ` ⚠️ ${fail} fallaron.` : ""}`
                    : `❌ No se pudo ejecutar ninguna acción.`
                await sendTelegramMessage(botToken, chatId, msg)
                return new Response("ok", { status: 200 })
            }
            if (normalized === "no" || normalized === "n") {
                delete pendingActions[historyKey]
                await sendTelegramMessage(botToken, chatId, "❌ Acciones canceladas.")
                return new Response("ok", { status: 200 })
            }
        }

        // ─── Typing indicator ────────────────────────────────────────
        await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, action: "typing" }),
        })

        // ─── Load snapshot ───────────────────────────────────────────
        const snap = await loadStoreSnapshot(storeId)

        // ─── Slash command shortcuts ─────────────────────────────────
        const lower = userText.toLowerCase()
        const commandMap: Record<string, string> = {
            "/resumen": "Dame un resumen ejecutivo completo de cómo va el negocio hoy: ventas, pedidos, tendencia y alertas importantes",
            "/hoy": "¿Cuántos pedidos y ventas hubo hoy? Listá todos los pedidos de hoy con su estado",
            "/ventas": "Dame un reporte de ventas de la última semana y del mes, con tendencia y comparación",
            "/tendencia": "¿Cómo viene la tendencia de ventas? ¿Sube o baja? Dame una predicción para los próximos días",
            "/horarios": "¿Cuál es el mejor horario y día para publicar en redes sociales según los patrones de compra?",
            "/stock": "¿Qué productos tienen stock bajo (5 o menos)? Listálos todos con su stock actual",
            "/catalogo": "Mostrame el catálogo completo de productos con precios, stock y estado",
            "/top": "¿Cuáles son los top 10 productos más vendidos y los top 10 clientes del mes?",
            "/inactivos": "Listá todos los productos que están pausados o inactivos",
            "/pedidos": "Listá todos los pedidos de hoy con cliente, total y estado",
            "/pendientes": "¿Cuántos pedidos hay pendientes y confirmados? Listálos todos",
            "/clientes": "Mostrame el top 10 de mejores clientes con su gasto total y cantidad de pedidos",
        }

        // Dynamic commands with arguments
        let query = commandMap[userText] || null

        if (!query && lower.startsWith("/categoria ")) {
            const cat = userText.slice(11).trim()
            query = `Listame todos los productos de la categoría "${cat}" con precio, stock y estado`
        }
        if (!query && lower.startsWith("/buscar ")) {
            const term = userText.slice(8).trim()
            query = `Buscá el pedido ${term} y mostrame todos sus detalles: cliente, total, estado, productos, fecha`
        }
        if (!query && lower.startsWith("/cliente ")) {
            const name = userText.slice(9).trim()
            query = `Dame toda la información disponible del cliente "${name}": historial de pedidos, gasto total, frecuencia`
        }
        if (!query && lower.startsWith("/pausar ")) {
            const prod = userText.slice(8).trim()
            query = `Pausá (desactivá) el producto "${prod}". Encontrá su ID en el catálogo y ejecutá la acción correspondiente`
        }
        if (!query && lower.startsWith("/activar ")) {
            const prod = userText.slice(9).trim()
            query = `Activá el producto "${prod}". Encontrá su ID en el catálogo y ejecutá la acción correspondiente`
        }
        if (!query && lower.startsWith("/precio ")) {
            const parts = userText.slice(8).trim().split(" ")
            const newPrice = parts.pop()
            const prod = parts.join(" ")
            query = `Cambiá el precio del producto "${prod}" a ${newPrice}. Encontrá su ID en el catálogo y ejecutá la acción correspondiente`
        }
        if (!query && lower.startsWith("/stockset ")) {
            const parts = userText.slice(10).trim().split(" ")
            const newStock = parts.pop()
            const prod = parts.join(" ")
            query = `Actualizá el stock del producto "${prod}" a ${newStock} unidades. Encontrá su ID y ejecutá la acción`
        }
        if (!query && lower.startsWith("/completar ")) {
            const num = userText.slice(11).trim()
            query = `Marcá como completado el pedido ${num}. Buscá su ID en los pedidos recientes y ejecutá la acción`
        }
        if (!query && lower.startsWith("/cancelar ")) {
            const num = userText.slice(10).trim()
            query = `Cancelá el pedido ${num}. Buscá su ID en los pedidos recientes y ejecutá la acción`
        }

        if (!query) query = userText

        // ─── Build and send to Groq ──────────────────────────────────
        if (!chatHistories[historyKey]) chatHistories[historyKey] = []
        chatHistories[historyKey].push({ role: "user", content: query })
        if (chatHistories[historyKey].length > 12) chatHistories[historyKey] = chatHistories[historyKey].slice(-12)

        const systemPrompt = buildSystemPrompt(snap)
        const aiMessages = [{ role: "system", content: systemPrompt }, ...chatHistories[historyKey]]

        const aiResponse = await callGroq(aiMessages)
        const { cleanText, actions, unknownQuestions } = parseActions(aiResponse)

        chatHistories[historyKey].push({ role: "assistant", content: cleanText })

        // Save unanswered questions for store training
        if (unknownQuestions.length > 0) {
            const username = message.from?.username || message.from?.first_name
            await saveFeedback(storeId, chatId, username, unknownQuestions, cleanText)
        }

        // ─── Send response ───────────────────────────────────────────
        await sendTelegramMessage(botToken, chatId, cleanText)

        // ─── If there are actions, ask for confirmation ──────────────
        if (actions.length > 0) {
            pendingActions[historyKey] = actions
            const confirmMsg = `\n⚡ *${actions.length} acción${actions.length > 1 ? "es" : ""} pendiente${actions.length > 1 ? "s" : ""}:*\n${actions.map((a, i) => `${i + 1}. ${describeAction(a)}`).join("\n")}\n\n¿Confirmar? Respondé *SI* o *NO*`
            await sendTelegramMessage(botToken, chatId, confirmMsg)
        }

        return new Response("ok", { status: 200 })
    } catch (err) {
        console.error("Telegram bot error:", err)
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
})
