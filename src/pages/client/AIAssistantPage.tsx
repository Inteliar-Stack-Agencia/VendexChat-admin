import { useState, useRef, useEffect } from 'react'
import {
    Wand2,
    Send,
    Bot,
    Sparkles,
    ShoppingCart,
    Calendar,
    FileText,
    Download,
    Copy,
    Share2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Search,
    Filter,
    Building2
} from 'lucide-react'
import { Card, Button, Badge, LoadingSpinner } from '../../components/common'
import { ordersApi } from '../../services/api'
import { Order } from '../../types'
import { formatPrice, formatDate } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import FeatureGuard from '../../components/FeatureGuard'
import { useAuth } from '../../contexts/AuthContext'
import { callAI } from '../../services/aiService'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    data?: any
}

export default function AIAssistantPage() {
    const { subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: '¡Hola! Soy tu Analista de Datos IA. ¿En qué reporte puedo ayudarte hoy? Por ejemplo: "Mostrame los pedidos de la empresa Morfi Viandas de la semana pasada".'
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
    const [reportText, setReportText] = useState<string | null>(null)
    const [isExecuting, setIsExecuting] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isTyping) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        try {
            // Llamada a la IA para interpretar la intención
            const systemPrompt = `Actúa como un experto analista de datos para un ecommerce. 
            Tu objetivo es entender qué pedidos quiere ver el usuario y traducir su pedido a un filtro estructurado.
            
            ESQUEMA DE DATOS (TABLA ORDERS):
            - customer_name: Nombre del cliente
            - customer_company: Empresa/Razón Social (puede estar en la metadata company_name)
            - created_at: Fecha de creación
            - total: Monto total
            - status: ['pending', 'confirmed', 'completed', 'cancelled']

            RESPONDE EXCLUSIVAMENTE EN FORMATO JSON:
            {
                "analysis": "Breve explicación de lo que entendiste",
                "filter": {
                    "company_name": "Nombre o null",
                    "date_range": "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "all",
                    "status": "completed" | "all"
                },
                "message": "Respuesta amigable para el usuario"
            }
            
            REGLA: Si el usuario pide "pedidos de [EMPRESA]", busca ese nombre. Si no especifica empresa, company_name es null.`;

            const aiText = await callAI([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ], plan)
            let aiResponse;
            try {
                // Limpiar posible markdown
                const jsonStr = aiText.includes('```') ? aiText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] || aiText : aiText;
                aiResponse = JSON.parse(jsonStr)
            } catch (e) {
                aiResponse = { message: aiText, filter: null }
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse.message || "Entendido. Voy a buscar esa información."
            }])

            if (aiResponse.filter) {
                await executeQuery(aiResponse.filter)
            }

        } catch (err) {
            console.error('AI Analyst Error:', err)
            showToast('error', 'Error al consultar la IA')
        } finally {
            setIsTyping(false)
        }
    }

    const executeQuery = async (filter: any) => {
        setIsExecuting(true)
        try {
            const res = await ordersApi.list({ limit: 1000 }) // Buscamos todos para filtrar localmente ya que metadata es complejo
            let results = res.data

            // Filtrado por Empresa
            if (filter.company_name) {
                results = results.filter(o =>
                    (o as any).metadata?.company_name?.toLowerCase().includes(filter.company_name.toLowerCase()) ||
                    o.customer_name?.toLowerCase().includes(filter.company_name.toLowerCase())
                )
            }

            // Filtrado por Fecha (Simplificado)
            const now = new Date()
            if (filter.date_range === 'today') {
                results = results.filter(o => new Date(o.created_at).toDateString() === now.toDateString())
            } else if (filter.date_range === 'yesterday') {
                const yesterday = new Date(now)
                yesterday.setDate(now.getDate() - 1)
                results = results.filter(o => new Date(o.created_at).toDateString() === yesterday.toDateString())
            } else if (filter.date_range === 'this_week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                results = results.filter(o => new Date(o.created_at) >= weekAgo)
            }

            setFilteredOrders(results)

            if (results.length > 0) {
                generateReport(results, filter.company_name || 'General')
            }
        } catch (err) {
            showToast('error', 'Error al ejecutar la consulta')
        } finally {
            setIsExecuting(false)
        }
    }

    const generateReport = (orders: Order[], company: string) => {
        const total = orders.reduce((acc, curr) => acc + curr.total, 0)
        const dateStr = new Date().toLocaleDateString('es-AR')

        let text = `📋 *REPORTE DE CONTROL PARA FACTURACIÓN*\n`
        text += `🏢 *Empresa:* ${company}\n`
        text += `📅 *Fecha de Generación:* ${dateStr}\n`
        text += `🔢 *Cant. Pedidos:* ${orders.length}\n`
        text += `--------------------------------\n\n`

        orders.forEach(o => {
            text += `🔹 ID: #${o.order_number || o.id.slice(0, 6)} | ${formatDate(o.created_at)} | *${formatPrice(o.total)}*\n`
        })

        text += `\n--------------------------------\n`
        text += `💰 *TOTAL A FACTURAR: ${formatPrice(total)}*\n`
        text += `\n_Generado automáticamente por VENDEx AI Inteligencia_`

        setReportText(text)
    }

    const copyReport = () => {
        if (reportText) {
            navigator.clipboard.writeText(reportText)
            showToast('success', 'Reporte copiado al portapapeles')
        }
    }

    return (
        <FeatureGuard feature="ai-analyst" minPlan="pro">
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black uppercase text-[9px]">Análisis Predictivo</Badge>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">VENDEx AI Inteligencia</h1>
                        <p className="text-slate-500 font-medium mt-1">Consultá tus métricas y generá reportes de facturación usando lenguaje natural.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[700px]">
                    {/* Chat Section */}
                    <Card className="flex flex-col h-full border-indigo-100 shadow-2xl shadow-indigo-50/50 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                    <Bot className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Data Analyst Chat</h3>
                            </div>
                            {isTyping && <Badge className="bg-indigo-500 text-white animate-pulse text-[8px]">Analizando consulta...</Badge>}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${m.role === 'user'
                                            ? 'bg-slate-900 text-white rounded-tr-none'
                                            : 'bg-indigo-50 text-slate-800 rounded-tl-none border border-indigo-100'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ej: Dame los pedidos de hoy..."
                                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Results & Report Section */}
                    <div className="flex flex-col gap-6 h-full">
                        {/* Result Table Preview */}
                        <Card className="flex-1 border-slate-100 bg-white shadow-xl overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista de Datos Filtrados</h3>
                                </div>
                                <Badge className="bg-indigo-50 text-indigo-600 font-black">{filteredOrders.length} Pedidos</Badge>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {isExecuting ? (
                                    <div className="h-full flex flex-col items-center justify-center p-12">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Extrayendo datos...</p>
                                    </div>
                                ) : filteredOrders.length > 0 ? (
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md">
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                <th className="px-5 py-3">ID</th>
                                                <th className="px-5 py-3">Cliente / Empresa</th>
                                                <th className="px-5 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredOrders.map(o => (
                                                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3 font-bold text-slate-900 text-xs">#{o.order_number || o.id.slice(0, 6)}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-800">{o.customer_name}</span>
                                                            <span className="text-[9px] font-black text-indigo-500 uppercase">{(o as any).metadata?.company_name || 'Sin Empresa'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-black text-slate-900 text-xs">{formatPrice(o.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                        <ShoppingCart className="w-12 h-12 text-slate-100 mb-4" />
                                        <p className="text-sm font-bold text-slate-300">Si pides un reporte, aparecerá aquí.</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Report Generator Box */}
                        <Card className="h-fit bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden group">
                            <div className="p-6 relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-indigo-400" />
                                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Reporte de Control</h3>
                                    </div>
                                    {reportText && (
                                        <div className="flex gap-2">
                                            <button onClick={copyReport} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Copiar">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white/5 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-[150px] overflow-y-auto scrollbar-hide border border-white/10 whitespace-pre-line">
                                    {reportText || 'Sin reporte generado. Realizá una consulta a la IA para comenzar.'}
                                </div>

                                <Button
                                    disabled={!reportText}
                                    onClick={copyReport}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-4 h-4" /> Copiar para WhatsApp / Facturación
                                </Button>
                            </div>
                            <Wand2 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                        </Card>
                    </div>
                </div>
            </div>
        </FeatureGuard>
    )
}
