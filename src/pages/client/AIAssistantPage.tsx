import { useState, useRef, useEffect, useCallback } from 'react'
import {
    Send,
    Wand2,
    FileText,
    Copy,
    Loader2,
    RefreshCw,
    Zap,
    Database,
    Brain,
    Trash2,
    ChevronUp,
    ChevronDown,
    MessageCircle,
    Link,
    Unlink,
    Eye,
    EyeOff,
    ExternalLink,
    Check,
    AlertCircle,
} from 'lucide-react'
import { Card, Button } from '../../components/common'
import { ordersApi, customersApi } from '../../services/api'
import { tenantApi } from '../../services/tenantApi'
import { productsApi } from '../../services/productsApi'
import { statsApi } from '../../services/statsApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import FeatureGuard from '../../components/FeatureGuard'
import { useAuth } from '../../contexts/AuthContext'
import { callAI } from '../../services/aiService'
import { supabase } from '../../supabaseClient'
import { getStoreId } from '../../services/coreApi'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

interface AIAction {
    type: 'update_order_status' | 'update_product_stock' | 'update_product_price' | 'update_product_active'
    // order
    order_id?: string
    order_number?: string
    new_status?: string
    // product
    product_id?: string
    product_name?: string
    new_stock?: number
    new_price?: number
    is_active?: boolean
    reason?: string
}

interface StoreSnapshot {
    generatedAt: string
    stats: {
        totalSales30d: number
        totalOrders30d: number
        avgTicket: number
        totalSales7d: number
        totalOrders7d: number
    }
    recentOrders: Record<string, unknown>[]
    topCustomers: Record<string, unknown>[]
    topProducts: Record<string, unknown>[]
    lowStockProducts: Record<string, unknown>[]
    allProducts: Record<string, unknown>[]
    customerCount: number
    dayOfWeek: string
}

const QUICK_CHIPS = [
    '¿Qué va a tener más demanda este finde?',
    '¿Cuál es mi categoría más rentable?',
    '¿Cuándo es el mejor horario para postear?',
    '¿Qué productos debería promocionar?',
    '¿Cómo viene la tendencia de ventas?',
    'Dame un plan de acción para esta semana',
]

const MANAGEMENT_CHIPS = [
    'Completá todos los pedidos pendientes',
    'Desactivá los productos sin stock',
    'Subí un 10% el precio de los productos top',
    'Mostrá todos los pedidos de hoy',
]

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function AIAssistantPage() {
    const { subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'

    const [messages, setMessages] = useState<Message[]>([{
        id: '0',
        role: 'assistant',
        content: '🔄 Cargando el estado completo de tu negocio... un momento.'
    }])

    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null)
    const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true)
    const [chatOpen, setChatOpen] = useState(true)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [pendingActions, setPendingActions] = useState<AIAction[]>([])
    const [executingActions, setExecutingActions] = useState(false)

    // Telegram config
    const [tgToken, setTgToken] = useState('')
    const [tgEnabled, setTgEnabled] = useState(false)
    const [tgBotUsername, setTgBotUsername] = useState('')
    const [tgConnecting, setTgConnecting] = useState(false)
    const [tgSaving, setTgSaving] = useState(false)
    const [tgShowToken, setTgShowToken] = useState(false)
    const [tgAllowedChatIds, setTgAllowedChatIds] = useState<number[]>([])
    const [tgNewChatId, setTgNewChatId] = useState('')
    const [, setTgLoaded] = useState(false)

    // Load Telegram config from tenant metadata
    useEffect(() => {
        const loadTgConfig = async () => {
            try {
                const tenant = await tenantApi.getMe()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tgConfig = (tenant.metadata as any)?.telegram_bot_config
                if (tgConfig) {
                    setTgToken(tgConfig.bot_token || '')
                    setTgEnabled(tgConfig.enabled || false)
                    setTgBotUsername(tgConfig.bot_username || '')
                    setTgAllowedChatIds(tgConfig.allowed_chat_ids || [])
                }
            } catch (err) {
                console.error('Error loading telegram config:', err)
            } finally {
                setTgLoaded(true)
            }
        }
        loadTgConfig()
    }, [])

    const handleTgConnect = async () => {
        if (!tgToken.trim()) {
            showToast('error', 'Ingresá el token del bot')
            return
        }
        setTgConnecting(true)
        try {
            const [{ data: { session } }, storeId] = await Promise.all([
                supabase.auth.getSession(),
                getStoreId(),
            ])
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

            const res = await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'setup-webhook',
                    botToken: tgToken.trim(),
                    storeId,
                }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Error al configurar webhook')

            const botUsername = result.botUsername || ''
            setTgBotUsername(botUsername)
            setTgEnabled(true)

            // Save to tenant metadata
            const tenant = await tenantApi.getMe()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentMetadata = (tenant.metadata || {}) as any
            await tenantApi.updateMe({
                metadata: {
                    ...currentMetadata,
                    telegram_bot_config: {
                        enabled: true,
                        bot_token: tgToken.trim(),
                        bot_username: botUsername,
                        allowed_chat_ids: tgAllowedChatIds,
                    }
                }
            })

            showToast('success', `Bot @${botUsername} conectado exitosamente`)
        } catch (err) {
            console.error('Telegram connect error:', err)
            showToast('error', err instanceof Error ? err.message : 'Error al conectar bot de Telegram')
        } finally {
            setTgConnecting(false)
        }
    }

    const handleTgDisconnect = async () => {
        setTgSaving(true)
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const { data: { session } } = await supabase.auth.getSession()

            await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'remove-webhook',
                    botToken: tgToken.trim(),
                }),
            })

            const tenant = await tenantApi.getMe()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentMetadata = (tenant.metadata || {}) as any
            await tenantApi.updateMe({
                metadata: {
                    ...currentMetadata,
                    telegram_bot_config: {
                        enabled: false,
                        bot_token: tgToken.trim(),
                        bot_username: tgBotUsername,
                        allowed_chat_ids: [],
                    }
                }
            })

            setTgEnabled(false)
            showToast('success', 'Bot de Telegram desconectado')
        } catch (err) {
            console.error('Telegram disconnect error:', err)
            showToast('error', err instanceof Error ? err.message : 'Error al desconectar')
        } finally {
            setTgSaving(false)
        }
    }

    const handleTgSaveSettings = async () => {
        setTgSaving(true)
        try {
            const tenant = await tenantApi.getMe()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const currentMetadata = (tenant.metadata || {}) as any
            await tenantApi.updateMe({
                metadata: {
                    ...currentMetadata,
                    telegram_bot_config: {
                        ...currentMetadata.telegram_bot_config,
                        allowed_chat_ids: tgAllowedChatIds,
                    }
                }
            })
            showToast('success', 'Configuración guardada')
        } catch {
            showToast('error', 'Error al guardar')
        } finally {
            setTgSaving(false)
        }
    }

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    // ─── Carga el contexto completo de la tienda ─────────────────────────────
    const loadStoreSnapshot = useCallback(async () => {
        setIsLoadingSnapshot(true)
        try {
            const [stats30d, stats7d, recentOrdersRes, topCustomersRaw, topProductsRaw, productsRes, customersRes] =
                await Promise.all([
                    statsApi.getOverview('30d'),
                    statsApi.getOverview('7d'),
                    ordersApi.list({ limit: 100 }),
                    statsApi.getTopCustomers(),
                    statsApi.getTopProducts(),
                    productsApi.list({ limit: 200 }),
                    customersApi.list({ limit: 200 }),
                ])

            const customerMap: Record<string, { name: string; phone: string; total: number; orders: number }> = {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            topCustomersRaw.forEach((o: any) => {
                const key = o.customer_whatsapp || o.customer_name || 'desconocido'
                if (!customerMap[key]) customerMap[key] = { name: o.customer_name, phone: o.customer_whatsapp, total: 0, orders: 0 }
                customerMap[key].total += Number(o.total) || 0
                customerMap[key].orders++
            })
            const topCustomers = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 10)

            const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            topProductsRaw.forEach((item: any) => {
                const name = item.products?.name || 'Sin nombre'
                if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
                productMap[name].qty += Number(item.quantity) || 0
                productMap[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0)
            })
            const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10)

            const lowStockProducts = productsRes.data.filter(p => !p.unlimited_stock && (p.stock ?? 0) <= 5)

            const snap: StoreSnapshot = {
                generatedAt: new Date().toISOString(),
                stats: {
                    totalSales30d: stats30d.totalSales,
                    totalOrders30d: stats30d.totalOrders,
                    avgTicket: stats30d.avgTicket,
                    totalSales7d: stats7d.totalSales,
                    totalOrders7d: stats7d.totalOrders,
                },
                recentOrders: recentOrdersRes.data.slice(0, 50).map(o => ({
                    id: o.id.slice(0, 8),
                    fullId: o.id,
                    num: o.order_number,
                    cliente: o.customer_name,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    empresa: (o as any).metadata?.company_name || null,
                    total: o.total,
                    estado: o.status,
                    fecha: o.created_at?.slice(0, 10),
                    hora: o.created_at?.slice(11, 16),
                    dia: DAYS_ES[new Date(o.created_at).getDay()],
                })),
                topCustomers,
                topProducts,
                lowStockProducts: lowStockProducts.map(p => ({ id: p.id, nombre: p.name, stock: p.stock, precio: p.price })),
                allProducts: productsRes.data.map(p => ({
                    id: p.id,
                    nombre: p.name,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    categoria: (p as any).category_name || 'Sin categoría',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    descripcion: (p as any).description || '',
                    precio: p.price,
                    stock: p.unlimited_stock ? '∞' : p.stock,
                    activo: p.is_active
                })),
                customerCount: customersRes.total || customersRes.data.length,
                dayOfWeek: DAYS_ES[new Date().getDay()],
            }

            setSnapshot(snap)

            const today = new Date().toISOString().slice(0, 10)
            const todayOrders = snap.recentOrders.filter(o => o.fecha === today)
            const weekGrowth = snap.stats.totalSales7d > 0 && snap.stats.totalSales30d > 0
                ? Math.round(((snap.stats.totalSales7d / (snap.stats.totalSales30d / 4.3)) - 1) * 100)
                : 0

            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ ¡Contexto completo cargado! Estado de tu negocio:\n\n` +
                    `📦 **Pedidos hoy:** ${todayOrders.length}\n` +
                    `💰 **Ventas (30d):** ${formatPrice(snap.stats.totalSales30d)} (${snap.stats.totalOrders30d} pedidos)\n` +
                    `⚡ **Ticket promedio:** ${formatPrice(snap.stats.avgTicket)}\n` +
                    `📈 **Tendencia semanal:** ${weekGrowth >= 0 ? '+' : ''}${weekGrowth}% vs promedio mensual\n` +
                    `👥 **Clientes:** ${snap.customerCount}\n` +
                    (snap.lowStockProducts.length > 0 ? `⚠️ **Stock bajo:** ${snap.lowStockProducts.length} productos\n` : '') +
                    `\nPreguntame sobre predicciones, rentabilidad, estrategia o lo que necesites 🧠`
            }])
        } catch (err) {
            console.error('Error loading snapshot:', err)
            showToast('error', 'No se pudo cargar el contexto de la tienda')
            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: '❌ Hubo un error al cargar los datos. Usá el botón ↺ para reintentar.'
            }])
        } finally {
            setIsLoadingSnapshot(false)
        }
    }, [])

    useEffect(() => { loadStoreSnapshot() }, [loadStoreSnapshot])

    // ─── System prompt con snapshot + factores externos ──────────────────────
    const buildSystemPrompt = (snap: StoreSnapshot): string => {
        const today = new Date().toISOString().slice(0, 10)
        const todayOrders = snap.recentOrders.filter(o => o.fecha === today)

        // Analizar patrones de días/horarios
        const ordersByDay: Record<string, number> = {}
        const ordersByHour: Record<string, number> = {}
        snap.recentOrders.forEach(o => {
            ordersByDay[o.dia] = (ordersByDay[o.dia] || 0) + 1
            if (o.hora) {
                const h = o.hora.slice(0, 2)
                ordersByHour[h] = (ordersByHour[h] || 0) + 1
            }
        })

        const bestDays = Object.entries(ordersByDay).sort((a, b) => b[1] - a[1]).slice(0, 3)
        const bestHours = Object.entries(ordersByHour).sort((a, b) => b[1] - a[1]).slice(0, 5)

        return `Sos el CEREBRO de inteligencia artificial de una tienda de ecommerce. Analizás TODOS los datos internos de la tienda MÁS factores externos para dar insights predictivos y estratégicos.

CONTEXTO ACTUAL (${new Date(snap.generatedAt).toLocaleString('es-AR')}):
Hoy es ${snap.dayOfWeek} ${today}.

═══ MÉTRICAS CLAVE ═══
- Ventas 30d: ${formatPrice(snap.stats.totalSales30d)} (${snap.stats.totalOrders30d} pedidos)
- Ventas 7d: ${formatPrice(snap.stats.totalSales7d)} (${snap.stats.totalOrders7d} pedidos)
- Ticket promedio: ${formatPrice(snap.stats.avgTicket)}
- Clientes totales: ${snap.customerCount}
- Pedidos hoy: ${todayOrders.length}

═══ PATRONES DETECTADOS ═══
Días con más ventas: ${bestDays.map(([d, n]) => `${d} (${n})`).join(', ') || 'Sin datos suficientes'}
Horarios pico: ${bestHours.map(([h, n]) => `${h}:00hs (${n} pedidos)`).join(', ') || 'Sin datos suficientes'}

═══ PEDIDOS RECIENTES (${snap.recentOrders.length}) ═══
${snap.recentOrders.slice(0, 30).map(o => `- ${o.dia} ${o.fecha} ${o.hora || ''} | #${o.num || o.id} | ${o.cliente}${o.empresa ? ` [${o.empresa}]` : ''} | ${formatPrice(o.total)} | ${o.estado}`).join('\n')}

═══ TOP 10 CLIENTES ═══
${snap.topCustomers.map((c, i) => `${i + 1}. ${c.name} | ${c.orders} pedidos | ${formatPrice(c.total)}`).join('\n')}

═══ TOP 10 PRODUCTOS ═══
${snap.topProducts.map((p, i) => `${i + 1}. ${p.name} | ${p.qty} uds | ${formatPrice(p.revenue)}`).join('\n')}

═══ CATÁLOGO COMPLETO (${snap.allProducts.length} productos) ═══
${snap.allProducts.map(p => `- [ID:${p.id}] [Cat:${p.categoria}] ${p.nombre}${p.descripcion ? ` — ${p.descripcion.slice(0, 80)}` : ''} | ${formatPrice(p.precio)} | Stock: ${p.stock} | ${p.activo ? 'Activo' : 'Oculto'}`).join('\n')}

═══ STOCK BAJO (≤5) ═══
${snap.lowStockProducts.length > 0 ? snap.lowStockProducts.map(p => `⚠️ [ID:${p.id}] ${p.nombre} | Stock: ${p.stock}`).join('\n') : '(Ninguno)'}

═══ TUS CAPACIDADES ═══
1. PREDICCIÓN DE DEMANDA: Basándote en patrones de días/horarios y tendencias, predecí qué productos van a tener más demanda
2. ANÁLISIS DE RENTABILIDAD: Analizá qué categorías/productos generan más ingresos vs volumen
3. TIMING ÓPTIMO: Recomendá mejores horarios para publicar en redes basándote en cuándo compran los clientes
4. ANÁLISIS DE TENDENCIAS: Compará semana vs mes, detectá si las ventas suben o bajan
5. SEGMENTACIÓN: Analizá comportamiento de clientes y recomendá estrategias
6. FACTORES EXTERNOS: Considerá día de la semana, momento del mes (quincena/fin de mes), estacionalidad, y contexto general del mercado argentino
7. PLANES DE ACCIÓN: Generá planes concretos con pasos específicos
8. GESTIÓN DIRECTA: Podés ejecutar cambios reales sobre pedidos y productos

═══ GESTIÓN DIRECTA — FORMATO DE ACCIONES ═══
Cuando el usuario te pida EJECUTAR cambios (no solo analizar), incluí al final de tu respuesta los comandos de acción. Usá este formato EXACTO, uno por línea:

Para cambiar estado de un pedido (estados válidos: pending, confirmed, completed, cancelled):
[[ACTION:{"type":"update_order_status","order_id":"ID_COMPLETO_DEL_PEDIDO","order_number":"NUM","new_status":"completed","reason":"descripción"}]]

Para actualizar stock de un producto:
[[ACTION:{"type":"update_product_stock","product_id":"ID_DEL_PRODUCTO","product_name":"NOMBRE","new_stock":10}]]

Para cambiar precio de un producto:
[[ACTION:{"type":"update_product_price","product_id":"ID_DEL_PRODUCTO","product_name":"NOMBRE","new_price":999.99}]]

Para activar/desactivar un producto:
[[ACTION:{"type":"update_product_active","product_id":"ID_DEL_PRODUCTO","product_name":"NOMBRE","is_active":true}]]

REGLAS IMPORTANTES:
- Usá los IDs exactos que aparecen en [ID:...] del catálogo o los fullId de pedidos recientes
- Solo incluí acciones cuando el usuario EXPLÍCITAMENTE pida realizar cambios
- Para análisis o recomendaciones NO incluyas acciones
- El usuario verá una confirmación antes de que se ejecute cualquier acción
- Podés incluir múltiples acciones en una misma respuesta

═══ INSTRUCCIONES ═══
- Respondé en español argentino, directo y accionable
- Usá datos reales para fundamentar cada insight
- Incluí porcentajes, comparaciones y métricas concretas
- Sé proactivo: si ves algo importante, mencionálo
- Usá emojis para hacer los reportes más visuales
- Cuando hagas predicciones, aclará que están basadas en los patrones detectados`
    }

    // ─── Parsear acciones del texto de la IA ─────────────────────────────────
    const parseActions = (text: string): { cleanText: string; actions: AIAction[] } => {
        const actionRegex = /\[\[ACTION:(.*?)\]\]/g
        const actions: AIAction[] = []
        let match
        while ((match = actionRegex.exec(text)) !== null) {
            try {
                actions.push(JSON.parse(match[1]) as AIAction)
            } catch { /* ignore malformed */ }
        }
        const cleanText = text.replace(/\[\[ACTION:.*?\]\]/g, '').replace(/\n{3,}/g, '\n\n').trim()
        return { cleanText, actions }
    }

    // ─── Ejecutar acciones confirmadas ───────────────────────────────────────
    const executeActions = async () => {
        setExecutingActions(true)
        let successCount = 0
        let errorCount = 0
        for (const action of pendingActions) {
            try {
                if (action.type === 'update_order_status' && action.order_id && action.new_status) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await ordersApi.updateStatus(action.order_id, action.new_status as any)
                    successCount++
                } else if (action.type === 'update_product_stock' && action.product_id && action.new_stock !== undefined) {
                    await productsApi.update(action.product_id, { stock: action.new_stock })
                    successCount++
                } else if (action.type === 'update_product_price' && action.product_id && action.new_price !== undefined) {
                    await productsApi.update(action.product_id, { price: action.new_price })
                    successCount++
                } else if (action.type === 'update_product_active' && action.product_id && action.is_active !== undefined) {
                    await productsApi.update(action.product_id, { is_active: action.is_active })
                    successCount++
                }
            } catch (err) {
                console.error('Error ejecutando acción:', action, err)
                errorCount++
            }
        }
        setPendingActions([])
        setExecutingActions(false)
        if (successCount > 0) {
            showToast('success', `${successCount} acción${successCount > 1 ? 'es' : ''} ejecutada${successCount > 1 ? 's' : ''} correctamente`)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ Ejecuté ${successCount} acción${successCount > 1 ? 'es' : ''} correctamente.${errorCount > 0 ? ` ⚠️ ${errorCount} fallaron.` : ''} Actualizando datos...`
            }])
            loadStoreSnapshot()
        }
        if (errorCount > 0 && successCount === 0) {
            showToast('error', 'Error al ejecutar las acciones')
        }
    }

    // ─── Enviar mensaje ───────────────────────────────────────────────────────
    const handleSend = async (overrideInput?: string) => {
        const query = (overrideInput ?? input).trim()
        if (!query || isTyping) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)
        setPendingActions([])

        try {
            if (!snapshot) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Todavía estoy cargando los datos. Esperá un momento...' }])
                return
            }

            const systemPrompt = buildSystemPrompt(snapshot)
            const history = messages.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

            const aiText = await callAI([
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: query }
            ], plan)

            const { cleanText, actions } = parseActions(aiText)
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: cleanText }])
            if (actions.length > 0) setPendingActions(actions)
        } catch (err) {
            console.error('AI Error:', err)
            showToast('error', 'Error al consultar la IA')
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Ocurrió un error. Intentá de nuevo.' }])
        } finally {
            setIsTyping(false)
        }
    }

    const copyLastResponse = () => {
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
        if (lastAssistant?.content) {
            navigator.clipboard.writeText(lastAssistant.content)
            showToast('success', 'Copiado al portapapeles')
        }
    }

    return (
        <FeatureGuard feature="ai-intelligence" minPlan="ultra">
            <div className="space-y-6 animate-fade-in">
                {/* Chat Card con gradiente */}
                <Card padding={false} className="border-0 shadow-2xl overflow-hidden rounded-[2rem]">
                    {/* Header con gradiente */}
                    <button
                        onClick={() => setChatOpen(!chatOpen)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-600 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-white">AI Inteligencia</h2>
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black text-white/70 uppercase tracking-widest hidden sm:inline">
                                        IA Activa · La IA analiza patrones, predice demanda y ...
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:flex px-3 py-1.5 border border-white/30 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">
                                Inteligencia IA
                            </span>
                            {chatOpen ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/70" />}
                        </div>
                    </button>

                    {chatOpen && (
                        <div className="border-t border-purple-200/30">
                            {/* Quick chips */}
                            <div className="flex items-center gap-2 px-6 py-3 flex-wrap bg-purple-50/50 border-b border-purple-100/50">
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Analizar:</span>
                                {QUICK_CHIPS.map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => handleSend(chip)}
                                        disabled={isTyping || isLoadingSnapshot}
                                        className="text-xs font-semibold px-3 py-1.5 bg-white border border-purple-200 rounded-full text-purple-700 hover:border-purple-400 hover:bg-purple-50 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 px-6 py-2.5 flex-wrap bg-amber-50/50">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Gestionar:</span>
                                {MANAGEMENT_CHIPS.map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => handleSend(chip)}
                                        disabled={isTyping || isLoadingSnapshot}
                                        className="text-xs font-semibold px-3 py-1.5 bg-white border border-amber-200 rounded-full text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            {/* Messages */}
                            <div ref={chatContainerRef} className="h-96 overflow-y-auto p-6 space-y-3 bg-white">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                            ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm'
                                            : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex items-start">
                                        <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-sm p-3">
                                            <div className="flex gap-1.5">
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pending Actions Confirmation */}
                            {pendingActions.length > 0 && (
                                <div className="mx-4 mb-2 mt-1 border border-amber-200 bg-amber-50 rounded-2xl overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border-b border-amber-200">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        <span className="text-xs font-black text-amber-700 uppercase tracking-widest">
                                            {pendingActions.length} acción{pendingActions.length > 1 ? 'es' : ''} pendiente{pendingActions.length > 1 ? 's' : ''} de confirmar
                                        </span>
                                    </div>
                                    <div className="px-4 py-2 space-y-1.5">
                                        {pendingActions.map((action, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-amber-800">
                                                <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                                {action.type === 'update_order_status' && (
                                                    <span>Pedido <strong>#{action.order_number}</strong> → <strong>{action.new_status}</strong>{action.reason ? ` (${action.reason})` : ''}</span>
                                                )}
                                                {action.type === 'update_product_stock' && (
                                                    <span>Stock de <strong>{action.product_name}</strong> → <strong>{action.new_stock} uds</strong></span>
                                                )}
                                                {action.type === 'update_product_price' && (
                                                    <span>Precio de <strong>{action.product_name}</strong> → <strong>{formatPrice(action.new_price ?? 0)}</strong></span>
                                                )}
                                                {action.type === 'update_product_active' && (
                                                    <span><strong>{action.product_name}</strong> → <strong>{action.is_active ? 'Activar' : 'Desactivar'}</strong></span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 px-4 py-2.5 border-t border-amber-200">
                                        <button
                                            onClick={executeActions}
                                            disabled={executingActions}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all disabled:opacity-60"
                                        >
                                            {executingActions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Confirmar y ejecutar
                                        </button>
                                        <button
                                            onClick={() => setPendingActions([])}
                                            disabled={executingActions}
                                            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold border border-gray-200 rounded-xl transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-4 bg-purple-50/30 border-t border-purple-100">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Escribí un comando para AI Inteligencia..."
                                        disabled={isLoadingSnapshot}
                                        className="flex-1 bg-white border border-purple-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 outline-none shadow-sm disabled:opacity-50"
                                    />
                                    {messages.length > 1 && (
                                        <button
                                            onClick={() => setMessages([])}
                                            disabled={isTyping}
                                            title="Limpiar chat"
                                            className="w-12 h-12 bg-white border border-slate-200 text-slate-400 rounded-full hover:text-rose-500 hover:border-rose-300 transition-all disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || isTyping || isLoadingSnapshot}
                                        className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-full shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                                    >
                                        {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Info cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-violet-600 to-purple-700 text-white border-0 shadow-2xl shadow-purple-100 relative overflow-hidden group">
                        <div className="p-6 relative z-10 space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-200" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-purple-200">Copiar respuesta</h3>
                            </div>
                            <p className="text-[11px] text-purple-200/80">
                                Pedile un reporte, predicción o plan de acción y copialo para compartir.
                            </p>
                            <Button
                                onClick={copyLastResponse}
                                className="w-full bg-white/20 hover:bg-white/30 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl backdrop-blur-sm flex items-center justify-center gap-2 border border-white/20"
                            >
                                <Copy className="w-4 h-4" /> Copiar última respuesta
                            </Button>
                        </div>
                        <Wand2 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 group-hover:rotate-12 transition-transform duration-700" />
                    </Card>

                    <Card className="border-purple-100 bg-purple-50/50 shadow-sm">
                        <div className="p-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-purple-400" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Qué analiza la IA</h3>
                                </div>
                                <button
                                    onClick={loadStoreSnapshot}
                                    disabled={isLoadingSnapshot}
                                    className="p-2 bg-white hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Actualizar datos"
                                >
                                    <RefreshCw className={`w-4 h-4 text-purple-500 ${isLoadingSnapshot ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {snapshot ? (
                                <div className="space-y-1.5">
                                    {[
                                        `${snapshot.recentOrders.length} pedidos recientes`,
                                        `${snapshot.topCustomers.length} mejores clientes`,
                                        `${snapshot.topProducts.length} productos top`,
                                        `${snapshot.allProducts.length} productos en catálogo`,
                                        `${snapshot.customerCount} clientes totales`,
                                        `Patrones de días y horarios`,
                                        `Estadísticas de 7d y 30d`,
                                        `Factores externos y estacionalidad`,
                                    ].map((label, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[11px] text-purple-700 font-medium">
                                            <Zap className="w-3 h-3 text-purple-400" />
                                            {label}
                                        </div>
                                    ))}
                                    <div className="pt-1 border-t border-purple-100 mt-1 space-y-1">
                                        {[
                                            'Cambiar estado de pedidos',
                                            'Actualizar stock y precios',
                                            'Activar / desactivar productos',
                                        ].map((label, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px] text-amber-600 font-medium">
                                                <Check className="w-3 h-3 text-amber-400" />
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-purple-400 pt-1">
                                        Actualizado: {new Date(snapshot.generatedAt).toLocaleTimeString('es-AR')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-[11px] text-purple-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cargando datos de la tienda...
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Telegram Bot Integration */}
                <Card className="border-purple-100 bg-white shadow-lg overflow-hidden">
                    <div className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                                    <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900">Bot de Telegram</h3>
                                    <p className="text-[11px] text-gray-500">Consultá la IA desde tu celular via Telegram</p>
                                </div>
                            </div>
                            {tgEnabled && tgBotUsername && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    Conectado
                                </span>
                            )}
                        </div>

                        {!tgEnabled ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-2xl space-y-3">
                                    <p className="text-xs text-blue-800 font-semibold">Cómo configurar:</p>
                                    <ol className="text-[11px] text-blue-700 space-y-1.5 list-decimal list-inside">
                                        <li>Abrí Telegram y buscá <span className="font-bold">@BotFather</span></li>
                                        <li>Enviá <code className="bg-blue-100 px-1 rounded">/newbot</code> y seguí los pasos</li>
                                        <li>Copiá el token que te da BotFather</li>
                                        <li>Pegalo acá abajo y dale a Conectar</li>
                                    </ol>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Token del Bot</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={tgShowToken ? 'text' : 'password'}
                                                value={tgToken}
                                                onChange={(e) => setTgToken(e.target.value)}
                                                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setTgShowToken(!tgShowToken)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {tgShowToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                        Chat IDs permitidos <span className="text-gray-400 normal-case font-normal">(opcional)</span>
                                    </label>
                                    {tgAllowedChatIds.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {tgAllowedChatIds.map(id => (
                                                <span key={id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full">
                                                    {id}
                                                    <button
                                                        onClick={() => setTgAllowedChatIds(prev => prev.filter(x => x !== id))}
                                                        className="text-blue-400 hover:text-red-500 transition-colors leading-none"
                                                    >×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tgNewChatId}
                                            onChange={(e) => setTgNewChatId(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const n = Number(tgNewChatId.trim())
                                                    if (n > 0 && !tgAllowedChatIds.includes(n)) {
                                                        setTgAllowedChatIds(prev => [...prev, n])
                                                        setTgNewChatId('')
                                                    }
                                                }
                                            }}
                                            placeholder="Ingresá un Chat ID"
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none"
                                        />
                                        <Button
                                            onClick={() => {
                                                const n = Number(tgNewChatId.trim())
                                                if (n > 0 && !tgAllowedChatIds.includes(n)) {
                                                    setTgAllowedChatIds(prev => [...prev, n])
                                                    setTgNewChatId('')
                                                }
                                            }}
                                            disabled={!tgNewChatId.trim()}
                                            className="px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                                        >
                                            Agregar
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Tu ID: escribile a @userinfobot en Telegram.</p>
                                </div>

                                <Button
                                    onClick={handleTgConnect}
                                    disabled={!tgToken.trim() || tgConnecting}
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                                >
                                    {tgConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                                    {tgConnecting ? 'Conectando...' : 'Conectar Bot'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800">
                                            @{tgBotUsername}
                                        </p>
                                        <p className="text-[11px] text-emerald-600">
                                            El bot está activo y respondiendo consultas con la misma IA de este módulo
                                        </p>
                                    </div>
                                    <a
                                        href={`https://t.me/${tgBotUsername}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto shrink-0 p-2 bg-white hover:bg-emerald-100 rounded-lg transition-colors"
                                        title="Abrir en Telegram"
                                    >
                                        <ExternalLink className="w-4 h-4 text-emerald-600" />
                                    </a>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Comandos disponibles</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { cmd: '/resumen', desc: 'Resumen ejecutivo' },
                                            { cmd: '/ventas', desc: 'Reporte de ventas' },
                                            { cmd: '/stock', desc: 'Stock bajo' },
                                            { cmd: '/top', desc: 'Top productos y clientes' },
                                            { cmd: '/limpiar', desc: 'Borrar historial' },
                                        ].map(c => (
                                            <div key={c.cmd} className="flex items-center gap-2 text-[11px]">
                                                <code className="bg-white px-2 py-0.5 rounded border text-blue-600 font-bold">{c.cmd}</code>
                                                <span className="text-gray-500">{c.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                            Chat IDs permitidos <span className="text-gray-400 normal-case font-normal">(opcional)</span>
                                        </label>

                                        {/* Chips de IDs actuales */}
                                        {tgAllowedChatIds.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {tgAllowedChatIds.map(id => (
                                                    <span key={id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full">
                                                        {id}
                                                        <button
                                                            onClick={() => setTgAllowedChatIds(prev => prev.filter(x => x !== id))}
                                                            className="text-blue-400 hover:text-red-500 transition-colors leading-none"
                                                            title="Quitar acceso"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Input para agregar nuevo ID */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tgNewChatId}
                                                onChange={(e) => setTgNewChatId(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const n = Number(tgNewChatId.trim())
                                                        if (n > 0 && !tgAllowedChatIds.includes(n)) {
                                                            setTgAllowedChatIds(prev => [...prev, n])
                                                            setTgNewChatId('')
                                                        }
                                                    }
                                                }}
                                                placeholder="Ingresá un Chat ID y presioná Enter o Agregar"
                                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none"
                                            />
                                            <Button
                                                onClick={() => {
                                                    const n = Number(tgNewChatId.trim())
                                                    if (n > 0 && !tgAllowedChatIds.includes(n)) {
                                                        setTgAllowedChatIds(prev => [...prev, n])
                                                        setTgNewChatId('')
                                                    }
                                                }}
                                                disabled={!tgNewChatId.trim()}
                                                className="px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                                            >
                                                Agregar
                                            </Button>
                                            <Button
                                                onClick={handleTgSaveSettings}
                                                disabled={tgSaving}
                                                className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                                            >
                                                {tgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Info box */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">¿Para qué sirve?</p>
                                        <p className="text-[11px] text-blue-600 leading-relaxed">
                                            El bot de Telegram es accesible para cualquier persona que lo encuentre. Agregar Chat IDs restringe el acceso solo a las personas que vos autoricés.
                                        </p>
                                        <ul className="text-[11px] text-blue-600 space-y-1">
                                            <li>• <strong>Vacío</strong> → cualquiera puede hablar con el bot y ver datos de tu tienda</li>
                                            <li>• <strong>Con IDs</strong> → solo esas personas pueden usarlo, el resto es ignorado</li>
                                        </ul>
                                        <p className="text-[11px] text-blue-500 mt-1">
                                            Para obtener tu ID: escribile a <strong>@userinfobot</strong> en Telegram. Separar múltiples IDs con coma.
                                        </p>
                                    </div>

                                    {/* Roles - próximamente */}
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Roles por usuario</p>
                                            <span className="text-[9px] bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Próximamente</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            En el futuro podrás asignar permisos distintos a cada Chat ID:
                                        </p>
                                        <ul className="text-[11px] text-gray-400 space-y-1">
                                            <li>• <strong className="text-gray-500">Admin</strong> → acceso total (ventas, clientes, stock, reportes)</li>
                                            <li>• <strong className="text-gray-500">Vendedor</strong> → solo ventas y pedidos</li>
                                            <li>• <strong className="text-gray-500">Depósito</strong> → solo stock y productos</li>
                                        </ul>
                                        <p className="text-[10px] text-gray-400 italic">
                                            También se podrían agregar comandos personalizados por rol, alertas automáticas de stock y notificaciones de nuevos pedidos.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleTgDisconnect}
                                    disabled={tgSaving}
                                    className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {tgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                                    Desconectar Bot
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </FeatureGuard>
    )
}
