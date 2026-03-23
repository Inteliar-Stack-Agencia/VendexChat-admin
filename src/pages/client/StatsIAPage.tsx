import { useState, useEffect, useRef, useCallback } from 'react'
import {
    BarChart3, Users, Package,
    Brain, Send, Loader2, Trash2, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight,
    Target, Flame, AlertTriangle, Sparkles,
} from 'lucide-react'
import { Card, LoadingSpinner } from '../../components/common'
import { ordersApi, customersApi } from '../../services/api'
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

interface StatsData {
    sales30d: number
    orders30d: number
    avgTicket30d: number
    sales7d: number
    orders7d: number
    avgTicket7d: number
    salesPrev7d: number
    ordersPrev7d: number
    customerCount: number
    productCount: number
    lowStockCount: number
    topProducts: { name: string; qty: number; revenue: number }[]
    topCustomers: { name: string; orders: number; total: number }[]
    ordersByDay: { day: string; count: number; total: number }[]
    ordersByHour: { hour: string; count: number }[]
    recentOrders: Record<string, unknown>[]
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const QUICK_CHIPS = [
    '¿Cómo estoy comparado a la semana pasada?',
    '¿Cuál es mi producto estrella?',
    'Dame un resumen ejecutivo',
    '¿Qué día vendo más?',
]

export default function StatsIAPage() {
    const { subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<StatsData | null>(null)

    // Chat
    const [chatOpen, setChatOpen] = useState(true)
    const [messages, setMessages] = useState<Message[]>([])
    const [chatInput, setChatInput] = useState('')
    const [chatTyping, setChatTyping] = useState(false)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    const loadStats = useCallback(async () => {
        setLoading(true)
        try {
            const [s30d, s7d, recentRes, topCustRaw, topProdRaw, prodRes, custRes] = await Promise.all([
                statsApi.getOverview('30d'),
                statsApi.getOverview('7d'),
                ordersApi.list({ limit: 100 }),
                statsApi.getTopCustomers(),
                statsApi.getTopProducts(),
                productsApi.list({ limit: 200 }),
                customersApi.list({ limit: 200 }),
            ])

            // Previous 7d (calculate from 30d minus 7d)
            const salesPrev7d = Math.max(0, s30d.totalSales - s7d.totalSales) / 3.3 // approximate weekly average of remaining 23d
            const ordersPrev7d = Math.max(0, s30d.totalOrders - s7d.totalOrders) / 3.3

            // Top customers
            const custMap: Record<string, { name: string; total: number; orders: number }> = {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            topCustRaw.forEach((o: any) => {
                const key = o.customer_whatsapp || o.customer_name || 'desconocido'
                if (!custMap[key]) custMap[key] = { name: o.customer_name, total: 0, orders: 0 }
                custMap[key].total += Number(o.total) || 0
                custMap[key].orders++
            })
            const topCustomers = Object.values(custMap).sort((a, b) => b.total - a.total).slice(0, 5)

            // Top products
            const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            topProdRaw.forEach((item: any) => {
                const name = item.products?.name || 'Sin nombre'
                if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 }
                prodMap[name].qty += Number(item.quantity) || 0
                prodMap[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0)
            })
            const topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

            // Orders by day of week
            const dayMap: Record<string, { count: number; total: number }> = {}
            const hourMap: Record<string, number> = {}
            const recentOrders = recentRes.data.slice(0, 50).map(o => {
                const d = new Date(o.created_at)
                const dayName = DAYS_ES[d.getDay()]
                const hour = d.getHours().toString().padStart(2, '0')
                dayMap[dayName] = dayMap[dayName] || { count: 0, total: 0 }
                dayMap[dayName].count++
                dayMap[dayName].total += Number(o.total) || 0
                hourMap[hour] = (hourMap[hour] || 0) + 1
                return {
                    num: o.order_number,
                    cliente: o.customer_name,
                    total: o.total,
                    estado: o.status,
                    fecha: o.created_at?.slice(0, 10),
                    hora: o.created_at?.slice(11, 16),
                    dia: DAYS_FULL[d.getDay()],
                }
            })

            const ordersByDay = DAYS_ES.map(d => ({ day: d, count: dayMap[d]?.count || 0, total: dayMap[d]?.total || 0 }))
            const ordersByHour = Object.entries(hourMap).sort((a, b) => a[0].localeCompare(b[0])).map(([h, c]) => ({ hour: h + ':00', count: c }))

            const lowStockCount = prodRes.data.filter(p => !p.unlimited_stock && (p.stock ?? 0) <= 5).length

            const data: StatsData = {
                sales30d: s30d.totalSales,
                orders30d: s30d.totalOrders,
                avgTicket30d: s30d.avgTicket,
                sales7d: s7d.totalSales,
                orders7d: s7d.totalOrders,
                avgTicket7d: s7d.totalOrders > 0 ? s7d.totalSales / s7d.totalOrders : 0,
                salesPrev7d,
                ordersPrev7d,
                customerCount: custRes.total || custRes.data.length,
                productCount: prodRes.data.length,
                lowStockCount,
                topProducts,
                topCustomers,
                ordersByDay,
                ordersByHour,
                recentOrders,
            }

            setStats(data)

            // Welcome message
            const salesChange = salesPrev7d > 0 ? Math.round(((s7d.totalSales / salesPrev7d) - 1) * 100) : 0
            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: `📊 Dashboard de Estadísticas IA cargado.\n\n` +
                    `💰 Ventas 7d: ${formatPrice(s7d.totalSales)} (${salesChange >= 0 ? '📈 +' : '📉 '}${salesChange}% vs promedio semanal)\n` +
                    `📦 ${s7d.totalOrders} pedidos esta semana | Ticket: ${formatPrice(data.avgTicket7d)}\n` +
                    `👥 ${data.customerCount} clientes | 📋 ${data.productCount} productos\n` +
                    (lowStockCount > 0 ? `⚠️ ${lowStockCount} productos con stock bajo\n` : '') +
                    `\nPreguntame por cualquier métrica o insight.`
            }])
        } catch (err) {
            console.error('Error loading stats:', err)
            showToast('error', 'Error al cargar estadísticas')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadStats() }, [loadStats])

    const handleChatSend = async (overrideInput?: string) => {
        const query = (overrideInput ?? chatInput).trim()
        if (!query || chatTyping || !stats) return

        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query }])
        setChatInput('')
        setChatTyping(true)

        try {
            const systemPrompt = `Sos un analista de estadísticas IA de una tienda ecommerce. Respondé en español argentino.

DATOS ACTUALES:
- Ventas 30d: ${formatPrice(stats.sales30d)} (${stats.orders30d} pedidos, ticket: ${formatPrice(stats.avgTicket30d)})
- Ventas 7d: ${formatPrice(stats.sales7d)} (${stats.orders7d} pedidos, ticket: ${formatPrice(stats.avgTicket7d)})
- Clientes: ${stats.customerCount} | Productos: ${stats.productCount} | Stock bajo: ${stats.lowStockCount}

TOP PRODUCTOS: ${stats.topProducts.map((p, i) => `${i + 1}. ${p.name} (${p.qty} uds, ${formatPrice(p.revenue)})`).join('; ')}
TOP CLIENTES: ${stats.topCustomers.map((c, i) => `${i + 1}. ${c.name} (${c.orders} ped, ${formatPrice(c.total)})`).join('; ')}
VENTAS POR DÍA: ${stats.ordersByDay.map(d => `${d.day}: ${d.count} ped (${formatPrice(d.total)})`).join('; ')}
HORARIOS PICO: ${stats.ordersByHour.slice(0, 5).map(h => `${h.hour}: ${h.count} ped`).join('; ')}

Respondé conciso, con datos concretos y emojis. Hacé comparaciones y detectá tendencias.`

            const history = messages.slice(-8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
            const aiText = await callAI([
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: query },
            ], plan)

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: aiText }])
        } catch {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Error al consultar la IA.' }])
        } finally {
            setChatTyping(false)
        }
    }

    // Helper for percentage change
    const pctChange = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0
        return Math.round(((current / prev) - 1) * 100)
    }

    if (loading) return <LoadingSpinner text="Cargando estadísticas IA..." />
    if (!stats) return null

    const salesChange = pctChange(stats.sales7d, stats.salesPrev7d)
    const ordersChange = pctChange(stats.orders7d, stats.ordersPrev7d)
    const bestDay = [...stats.ordersByDay].sort((a, b) => b.count - a.count)[0]
    const bestHour = stats.ordersByHour.length > 0 ? [...stats.ordersByHour].sort((a, b) => b.count - a.count)[0] : null
    const maxDayCount = Math.max(...stats.ordersByDay.map(d => d.count), 1)

    return (
        <FeatureGuard feature="ai-analyst" minPlan="ultra">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Estadísticas IA</h1>
                            <p className="text-xs text-slate-500 font-medium">Dashboard inteligente con insights de IA</p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Ventas 7d</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{formatPrice(stats.sales7d)}</p>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${salesChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {salesChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {salesChange >= 0 ? '+' : ''}{salesChange}%
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">vs promedio semanal</p>
                    </Card>

                    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pedidos 7d</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{stats.orders7d}</p>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${ordersChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {ordersChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {ordersChange >= 0 ? '+' : ''}{ordersChange}%
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">vs promedio semanal</p>
                    </Card>

                    <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                        <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Ticket Promedio</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{formatPrice(stats.avgTicket7d)}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">últimos 7 días</p>
                    </Card>

                    <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Clientes</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">{stats.customerCount}</p>
                            </div>
                            {stats.lowStockCount > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    {stats.lowStockCount} stock bajo
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">{stats.productCount} productos activos</p>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ventas por día */}
                    <Card className="border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pedidos por Día</h3>
                            {bestDay && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Flame className="w-3 h-3" /> Mejor: {bestDay.day}
                                </span>
                            )}
                        </div>
                        <div className="flex items-end gap-2 h-32">
                            {stats.ordersByDay.map((d) => (
                                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold text-slate-500">{d.count}</span>
                                    <div
                                        className={`w-full rounded-t-lg transition-all ${d.day === bestDay?.day ? 'bg-gradient-to-t from-blue-600 to-cyan-400' : 'bg-slate-200'}`}
                                        style={{ height: `${Math.max(4, (d.count / maxDayCount) * 100)}%` }}
                                    />
                                    <span className="text-[9px] font-black text-slate-400">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Top Productos */}
                    <Card className="border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Productos</h3>
                            <Package className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="space-y-3">
                            {stats.topProducts.map((p, i) => {
                                const maxQty = stats.topProducts[0]?.qty || 1
                                return (
                                    <div key={p.name} className="flex items-center gap-3">
                                        <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-slate-300'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                                                <span className="text-[10px] font-bold text-slate-500">{p.qty} uds · {formatPrice(p.revenue)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${i === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-slate-300'}`}
                                                    style={{ width: `${(p.qty / maxQty) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {stats.topProducts.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4">Sin datos suficientes</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Second row: Top Customers + Best Times */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Clientes</h3>
                            <Users className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="space-y-3">
                            {stats.topCustomers.map((c, i) => (
                                <div key={c.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-amber-500' : 'text-slate-300'}`}>{i + 1}</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{c.name}</p>
                                            <p className="text-[10px] text-slate-400">{c.orders} pedidos</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-700">{formatPrice(c.total)}</span>
                                </div>
                            ))}
                            {stats.topCustomers.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4">Sin datos suficientes</p>
                            )}
                        </div>
                    </Card>

                    <Card className="border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Horarios Pico</h3>
                            <Target className="w-4 h-4 text-slate-300" />
                        </div>
                        {stats.ordersByHour.length > 0 ? (
                            <div className="space-y-2">
                                {[...stats.ordersByHour].sort((a, b) => b.count - a.count).slice(0, 6).map((h, i) => {
                                    const maxH = stats.ordersByHour.reduce((max, x) => Math.max(max, x.count), 1)
                                    return (
                                        <div key={h.hour} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-500 w-12">{h.hour}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${i === 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'}`}
                                                    style={{ width: `${(h.count / maxH) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{h.count}</span>
                                        </div>
                                    )
                                })}
                                {bestHour && (
                                    <p className="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Mejor horario para publicar: {bestHour.hour}hs
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-4">Sin datos suficientes</p>
                        )}
                    </Card>
                </div>

                {/* AI Chat */}
                <Card padding={false} className="border-0 shadow-2xl overflow-hidden rounded-[2rem]">
                    <button
                        onClick={() => setChatOpen(!chatOpen)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-black text-white">Analista IA</h2>
                                <span className="text-[9px] font-black text-white/70 uppercase tracking-widest hidden sm:inline">
                                    Preguntá sobre tus métricas y obtené insights
                                </span>
                            </div>
                        </div>
                        {chatOpen ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/70" />}
                    </button>

                    {chatOpen && (
                        <div className="border-t border-blue-200/30">
                            <div className="flex items-center gap-2 px-6 py-3 flex-wrap bg-blue-50/50">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Probá:</span>
                                {QUICK_CHIPS.map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => handleChatSend(chip)}
                                        disabled={chatTyping || loading}
                                        className="text-xs font-semibold px-3 py-1.5 bg-white border border-blue-200 rounded-full text-blue-700 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            <div ref={chatContainerRef} className="h-64 overflow-y-auto p-6 space-y-3 bg-white">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                            ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm'
                                            : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {chatTyping && (
                                    <div className="flex items-start">
                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tl-sm p-3">
                                            <div className="flex gap-1.5">
                                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50/30 border-t border-blue-100">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                                        placeholder="Preguntá sobre tus estadísticas..."
                                        className="flex-1 bg-white border border-blue-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 outline-none shadow-sm"
                                    />
                                    {messages.length > 1 && (
                                        <button
                                            onClick={() => setMessages([])}
                                            disabled={chatTyping}
                                            title="Limpiar chat"
                                            className="w-12 h-12 bg-white border border-slate-200 text-slate-400 rounded-full hover:text-rose-500 hover:border-rose-300 transition-all disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleChatSend()}
                                        disabled={!chatInput.trim() || chatTyping}
                                        className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-full shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                                    >
                                        {chatTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </FeatureGuard>
    )
}
