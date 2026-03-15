import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Send, Bot, Users, Loader2, RefreshCw, Settings
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card, Badge } from '../../components/common'
import { customersApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import { callAI } from '../../services/aiService'
import type { Customer } from '../../types'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

const QUICK_CHIPS = [
    '¿Quiénes son mis mejores clientes?',
    'Clientes sin compras hace 30 días',
    'Segmentá por ticket promedio',
]

// --- Etiquetas automáticas basadas en comportamiento ---
function classifyCustomer(customer: Customer, allCustomers: Customer[]): string[] {
    const tags: string[] = []
    const days = customer.last_order_at
        ? Math.floor((Date.now() - new Date(customer.last_order_at).getTime()) / 86400000)
        : 999

    if (allCustomers.length >= 5) {
        const sorted = [...allCustomers].sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
        const vipIdx = Math.max(0, Math.ceil(allCustomers.length * 0.2) - 1)
        if (Number(customer.total_spent) >= Number(sorted[vipIdx]?.total_spent) && Number(customer.total_spent) > 0) {
            tags.push('VIP')
        }
    }

    if (days >= 60) {
        tags.push('Inactivo')
    } else if (days >= 20 && customer.total_orders >= 2) {
        tags.push('En riesgo')
    }

    if (customer.total_orders >= 3 && days < 60) {
        tags.push('Frecuente')
    } else if (customer.total_orders === 1) {
        tags.push('Nuevo')
    }

    return tags
}

function CrmIaPageInner() {
    const navigate = useNavigate()
    const { subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'

    const [messages, setMessages] = useState<Message[]>([{
        id: '0',
        role: 'assistant',
        content: 'Cargando datos de tus clientes... un momento.'
    }])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // --- Cargar datos de clientes ---
    const loadCustomerData = useCallback(async () => {
        setIsLoadingData(true)
        try {
            const res = await customersApi.list({ limit: 200 })
            const data = res.data
            setCustomers(data)

            // Generar resumen inicial
            const totalClients = data.length
            const totalSpent = data.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0)
            const totalOrders = data.reduce((acc, c) => acc + (Number(c.total_orders) || 0), 0)
            const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0

            const vips = data.filter(c => classifyCustomer(c, data).includes('VIP')).length
            const inactive = data.filter(c => classifyCustomer(c, data).includes('Inactivo')).length
            const atRisk = data.filter(c => classifyCustomer(c, data).includes('En riesgo')).length

            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: `Hola! Soy tu asistente de CRM. Ya cargué los datos de tus clientes.\n\n` +
                    `**Resumen actual:**\n` +
                    `- ${totalClients} clientes registrados\n` +
                    `- ${formatPrice(totalSpent)} facturado en total\n` +
                    `- Ticket promedio: ${formatPrice(avgTicket)}\n` +
                    `- ${vips} clientes VIP | ${atRisk} en riesgo | ${inactive} inactivos\n\n` +
                    `Preguntame lo que necesites sobre tus clientes, segmentación o estrategias de retención.`
            }])
        } catch (err) {
            console.error('Error loading customers:', err)
            showToast('error', 'No se pudieron cargar los datos de clientes')
            setMessages([{
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Hubo un error al cargar los datos. Usá el botón de actualizar para reintentar.'
            }])
        } finally {
            setIsLoadingData(false)
        }
    }, [])

    useEffect(() => { loadCustomerData() }, [loadCustomerData])

    // --- System prompt con datos de clientes ---
    const buildSystemPrompt = (customersData: Customer[]): string => {
        const totalSpent = customersData.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0)
        const totalOrders = customersData.reduce((acc, c) => acc + (Number(c.total_orders) || 0), 0)
        const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0

        const customerList = customersData.map(c => {
            const days = c.last_order_at
                ? Math.floor((Date.now() - new Date(c.last_order_at).getTime()) / 86400000)
                : null
            const tags = classifyCustomer(c, customersData)
            const customerAvgTicket = c.total_orders > 0
                ? Number(c.total_spent) / c.total_orders
                : 0
            return `- ${c.name} | WhatsApp: ${c.whatsapp} | Pedidos: ${c.total_orders} | Total: ${formatPrice(Number(c.total_spent))} | Ticket prom: ${formatPrice(customerAvgTicket)} | Días sin comprar: ${days ?? 'sin pedidos'} | Tags: ${tags.length > 0 ? tags.join(', ') : 'ninguno'}${c.notes ? ` | Notas: ${c.notes}` : ''}`
        }).join('\n')

        return `Sos el asistente de CRM inteligente de una tienda de ecommerce latinoamericana. Tenés acceso a TODOS los datos reales de los clientes.

CONTEXTO ACTUAL:
- Total clientes: ${customersData.length}
- Total facturado: ${formatPrice(totalSpent)}
- Total pedidos: ${totalOrders}
- Ticket promedio general: ${formatPrice(avgTicket)}

REGLAS DE SEGMENTACIÓN AUTOMÁTICA:
- VIP: top 20% por gasto total (si hay al menos 5 clientes)
- Frecuente: 3+ pedidos y activo (< 60 días sin comprar)
- En riesgo: 20-59 días sin comprar y al menos 2 pedidos históricos
- Inactivo: 60+ días sin comprar
- Nuevo: primer pedido registrado (1 pedido)

BASE DE CLIENTES COMPLETA:
${customerList}

INSTRUCCIONES:
- Respondé en español, de forma directa y concisa
- Usá los datos reales de arriba para responder cualquier pregunta
- Podés hacer cálculos, comparaciones, rankings y recomendaciones
- Si te piden segmentar, usá las reglas de segmentación o creá segmentos ad-hoc
- Si te piden generar mensajes de WhatsApp, crealos personalizados y listos para enviar
- Cuando muestres rankings o listas, usá formato legible con emojis
- Podés sugerir acciones concretas: enviar ofertas, reactivar inactivos, premiar VIPs
- Si te piden potencial de recuperación, calculálo basado en ticket promedio histórico
- No inventes datos ni clientes que no existan en la base`
    }

    // --- Enviar mensaje ---
    const handleSend = async (overrideInput?: string) => {
        const query = (overrideInput ?? input).trim()
        if (!query || isTyping) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        try {
            if (customers.length === 0) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Todavía estoy cargando los datos de clientes. Esperá un momento...'
                }])
                return
            }

            const systemPrompt = buildSystemPrompt(customers)
            const history = messages.slice(-10).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }))

            const aiText = await callAI([
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: query }
            ], plan)

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: aiText
            }])
        } catch (err) {
            console.error('AI Error:', err)
            showToast('error', 'Error al consultar la IA')
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Ocurrió un error. Intentá de nuevo.'
            }])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-4 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">CRM IA</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                IA Activa · Conocé a tus clientes, segmentalos y ejecutá acciones
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/orders')}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                    <span className="hidden sm:inline">Gestión de tienda</span>
                    <Settings className="w-4 h-4 sm:hidden" />
                </button>
            </div>

            {/* Quick chips */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Probá:</span>
                {QUICK_CHIPS.map(chip => (
                    <button
                        key={chip}
                        onClick={() => handleSend(chip)}
                        disabled={isTyping || isLoadingData}
                        className="text-xs font-semibold px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {/* Chat */}
            <Card className="flex flex-col border-slate-200 shadow-xl rounded-3xl overflow-hidden h-[calc(100vh-280px)] min-h-[400px]">
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">CRM IA</span>
                        {customers.length > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 text-[8px] font-black">
                                {customers.length} clientes cargados
                            </Badge>
                        )}
                    </div>
                    <button
                        onClick={loadCustomerData}
                        disabled={isLoadingData}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        title="Actualizar datos de clientes"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingData ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                                : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                                }`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex items-start gap-2">
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm p-4">
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

                {/* Input */}
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribí un comando para CRM IA..."
                            disabled={isLoadingData}
                            className="flex-1 bg-white border border-slate-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none shadow-sm disabled:opacity-50"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping || isLoadingData}
                            className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                        >
                            {isTyping ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default function CrmIaPage() {
    return (
        <FeatureGuard feature="ai-intelligence" minPlan="vip">
            <CrmIaPageInner />
        </FeatureGuard>
    )
}
