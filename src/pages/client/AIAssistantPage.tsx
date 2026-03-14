import { useState, useRef, useEffect, useCallback } from 'react'
import {
    Sparkles,
    Send,
    Bot,
    Wand2,
    FileText,
    Copy,
    Loader2,
    RefreshCw,
    Zap,
    Database,
} from 'lucide-react'
import { Card, Button, Badge } from '../../components/common'
import { ordersApi } from '../../services/api'
import { productsApi } from '../../services/productsApi'
import { statsApi } from '../../services/statsApi'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import FeatureGuard from '../../components/FeatureGuard'
import { useAuth } from '../../contexts/AuthContext'
import { callAI } from '../../services/aiService'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
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
    recentOrders: any[]
    topCustomers: any[]
    topProducts: any[]
    lowStockProducts: any[]
    allProducts: any[]
}

const QUICK_CHIPS = [
    '¿Cuánto vendí este mes?',
    '¿Cuáles son mis pedidos de hoy?',
    '¿Qué productos tienen poco stock?',
    '¿Quién es mi mejor cliente?',
    '¿Cuál es el producto más vendido?',
    '¿Qué tengo que preparar hoy?',
]

export default function AIAssistantPage() {
    const { subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'

    const [messages, setMessages] = useState<Message[]>([{
        id: '0',
        role: 'assistant',
        content: '¡Hola! Soy tu analista de tienda. Estoy cargando el estado actual de tu negocio... un momento. 🔄'
    }])

    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null)
    const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ─── Carga el contexto completo de la tienda ─────────────────────────────
    const loadStoreSnapshot = useCallback(async () => {
        setIsLoadingSnapshot(true)
        try {
            const [stats30d, stats7d, recentOrdersRes, topCustomersRaw, topProductsRaw, productsRes] =
                await Promise.all([
                    statsApi.getOverview('30d'),
                    statsApi.getOverview('7d'),
                    ordersApi.list({ limit: 100 }),
                    statsApi.getTopCustomers(),
                    statsApi.getTopProducts(),
                    productsApi.list({ limit: 200 }),
                ])

            // Agrupa top customers
            const customerMap: Record<string, { name: string; phone: string; total: number; orders: number }> = {}
            topCustomersRaw.forEach((o: any) => {
                const key = o.customer_whatsapp || o.customer_name || 'desconocido'
                if (!customerMap[key]) customerMap[key] = { name: o.customer_name, phone: o.customer_whatsapp, total: 0, orders: 0 }
                customerMap[key].total += Number(o.total) || 0
                customerMap[key].orders++
            })
            const topCustomers = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 10)

            // Agrupa top products
            const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
            topProductsRaw.forEach((item: any) => {
                const name = item.products?.name || 'Sin nombre'
                if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
                productMap[name].qty += Number(item.quantity) || 0
                productMap[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0)
            })
            const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10)

            // Stock bajo
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
                    num: o.order_number,
                    cliente: o.customer_name,
                    empresa: (o as any).metadata?.company_name || null,
                    total: o.total,
                    estado: o.status,
                    fecha: o.created_at?.slice(0, 10),
                })),
                topCustomers,
                topProducts,
                lowStockProducts: lowStockProducts.map(p => ({ nombre: p.name, stock: p.stock, precio: p.price })),
                allProducts: productsRes.data.map(p => ({
                    nombre: p.name,
                    precio: p.price,
                    stock: p.unlimited_stock ? '∞' : p.stock,
                    activo: p.is_active
                })),
            }

            setSnapshot(snap)

            const today = new Date().toISOString().slice(0, 10)
            const todayOrders = snap.recentOrders.filter(o => o.fecha === today)

            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ ¡Contexto cargado! Así está tu tienda ahora mismo:\n\n📦 **Pedidos de hoy:** ${todayOrders.length}\n💰 **Ventas (30d):** ${formatPrice(snap.stats.totalSales30d)} (${snap.stats.totalOrders30d} pedidos)\n⚡ **Ticket promedio:** ${formatPrice(snap.stats.avgTicket)}${snap.lowStockProducts.length > 0 ? `\n⚠️ **Productos con poco stock:** ${snap.lowStockProducts.length}` : ''}\n\nPreguntame cualquier cosa sobre tu tienda 🙌`
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

    // ─── System prompt con snapshot completo ─────────────────────────────────
    const buildSystemPrompt = (snap: StoreSnapshot): string => {
        const today = new Date().toISOString().slice(0, 10)
        const todayOrders = snap.recentOrders.filter(o => o.fecha === today)

        return `Sos el analista de datos experto de una tienda de ecommerce. TENÉS ACCESO A TODOS LOS DATOS REALES DE LA TIENDA en este momento.

CONTEXTO ACTUAL (actualizado: ${new Date(snap.generatedAt).toLocaleString('es-AR')}):

═══ ESTADÍSTICAS ═══
- Ventas últimos 30 días: ${formatPrice(snap.stats.totalSales30d)} (${snap.stats.totalOrders30d} pedidos)
- Ventas últimos 7 días: ${formatPrice(snap.stats.totalSales7d)} (${snap.stats.totalOrders7d} pedidos)
- Ticket promedio: ${formatPrice(snap.stats.avgTicket)}
- Pedidos de hoy (${today}): ${todayOrders.length}

═══ PEDIDOS DE HOY ═══
${todayOrders.length > 0 ? todayOrders.map(o => `- #${o.num || o.id} | ${o.cliente}${o.empresa ? ` (${o.empresa})` : ''} | ${formatPrice(o.total)} | ${o.estado}`).join('\n') : '(Sin pedidos hoy todavía)'}

═══ ÚLTIMOS 50 PEDIDOS ═══
${snap.recentOrders.map(o => `- #${o.num || o.id} | ${o.fecha} | ${o.cliente}${o.empresa ? ` [${o.empresa}]` : ''} | ${formatPrice(o.total)} | ${o.estado}`).join('\n')}

═══ TOP 10 CLIENTES ═══
${snap.topCustomers.map((c, i) => `${i + 1}. ${c.name} | ${c.orders} pedidos | Total: ${formatPrice(c.total)}`).join('\n')}

═══ TOP 10 PRODUCTOS MÁS VENDIDOS ═══
${snap.topProducts.map((p, i) => `${i + 1}. ${p.name} | ${p.qty} unidades | Recaudado: ${formatPrice(p.revenue)}`).join('\n')}

═══ CATÁLOGO COMPLETO (${snap.allProducts.length} productos) ═══
${snap.allProducts.map(p => `- ${p.nombre} | Precio: ${formatPrice(p.precio)} | Stock: ${p.stock} | Activo: ${p.activo ? 'Sí' : 'No'}`).join('\n')}

═══ PRODUCTOS CON STOCK BAJO (≤5) ═══
${snap.lowStockProducts.length > 0 ? snap.lowStockProducts.map(p => `⚠️ ${p.nombre} | Stock: ${p.stock} | Precio: ${formatPrice(p.precio)}`).join('\n') : '(Ninguno)'}

═══ INSTRUCCIONES ═══
- Respondé en español, de forma directa y concisa
- Usá los datos reales de arriba para responder cualquier pregunta
- Podés hacer cálculos, comparaciones y recomendaciones
- Si te piden un reporte, generálo estructurado con los datos reales
- Si te piden pedidos de una empresa, filtrá por el campo empresa
- Usá emojis para que sea más visual y amigable`
    }

    // ─── Enviar mensaje ───────────────────────────────────────────────────────
    const handleSend = async (overrideInput?: string) => {
        const query = (overrideInput ?? input).trim()
        if (!query || isTyping) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

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

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: aiText }])
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

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <FeatureGuard feature="ai-analyst" minPlan="vip">
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black uppercase text-[9px]">
                                Contexto en tiempo real
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">VENDEx AI Inteligencia</h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Tu asistente conoce toda tu tienda. Preguntale lo que quieras.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {snapshot && (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                                <Database className="w-4 h-4 text-green-500" />
                                <span className="text-[10px] font-black text-green-600 uppercase">Datos cargados</span>
                            </div>
                        )}
                        <button
                            onClick={loadStoreSnapshot}
                            disabled={isLoadingSnapshot}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                            title="Actualizar datos de la tienda"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoadingSnapshot ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Chat */}
                <Card className="flex flex-col border-indigo-100 shadow-2xl shadow-indigo-50/50 rounded-[2.5rem] overflow-hidden" style={{ height: '65vh' }}>
                    <div className="p-5 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Bot className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Analista IA de Tienda</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {isLoadingSnapshot && (
                                <Badge className="bg-amber-100 text-amber-600 animate-pulse text-[8px] flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Cargando tienda...
                                </Badge>
                            )}
                            {isTyping && (
                                <Badge className="bg-indigo-500 text-white animate-pulse text-[8px]">
                                    Analizando...
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.role === 'assistant' && (
                                    <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                        <Bot className="w-4 h-4 text-indigo-600" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium whitespace-pre-wrap ${m.role === 'user'
                                    ? 'bg-slate-900 text-white rounded-tr-none'
                                    : 'bg-indigo-50 text-slate-800 rounded-tl-none border border-indigo-100'
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-start gap-2">
                                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl rounded-tl-none p-4">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chips de acceso rápido */}
                    <div className="px-6 pt-3 pb-1 bg-slate-50/80 border-t border-slate-100 flex flex-wrap gap-2">
                        {QUICK_CHIPS.map(chip => (
                            <button
                                key={chip}
                                onClick={() => handleSend(chip)}
                                disabled={isTyping || isLoadingSnapshot}
                                className="text-[10px] font-black px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-slate-50">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Preguntame cualquier cosa sobre tu tienda..."
                                disabled={isLoadingSnapshot}
                                className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm disabled:opacity-50"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isTyping || isLoadingSnapshot}
                                className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Footer cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Copiar respuesta */}
                    <Card className="bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden group">
                        <div className="p-6 relative z-10 space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Copiar respuesta</h3>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Pedile a la IA un reporte de pedidos o ventas y copiarlo para WhatsApp o facturación.
                            </p>
                            <Button
                                onClick={copyLastResponse}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-2"
                            >
                                <Copy className="w-4 h-4" /> Copiar última respuesta
                            </Button>
                        </div>
                        <Wand2 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                    </Card>

                    {/* Info del snapshot */}
                    <Card className="border-slate-100 bg-slate-50 shadow-sm">
                        <div className="p-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-slate-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Qué conoce la IA ahora</h3>
                            </div>
                            {snapshot ? (
                                <div className="space-y-1.5">
                                    {[
                                        `${snapshot.recentOrders.length} pedidos recientes`,
                                        `${snapshot.topCustomers.length} mejores clientes`,
                                        `${snapshot.topProducts.length} productos más vendidos`,
                                        `${snapshot.allProducts.length} productos en catálogo`,
                                        `${snapshot.lowStockProducts.length} con stock bajo`,
                                        `Estadísticas de 7d y 30d`,
                                    ].map((label, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                                            <Zap className="w-3 h-3 text-green-500" />
                                            {label}
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-slate-400 pt-1">
                                        Actualizado: {new Date(snapshot.generatedAt).toLocaleTimeString('es-AR')}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cargando datos de la tienda...
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </FeatureGuard>
    )
}
