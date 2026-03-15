import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Users, Search, MessageSquare, ClipboardList, ShoppingBag,
    TrendingUp, UserCheck, DollarSign, Bot, Sparkles, Copy, CheckCircle2,
    Send, Loader2, RefreshCw, Settings, ChevronDown, ChevronUp
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card, LoadingSpinner, EmptyState, Modal, Button, showToast } from '../../components/common'
import { customersApi, tenantApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, formatShortDate, whatsappLink, orderStatusConfig } from '../../utils/helpers'
import type { Customer } from '../../types'

// --- Etiquetas automáticas basadas en comportamiento ---
function getCustomerTags(customer: Customer, allCustomers: Customer[]) {
    const tags: { label: string; color: string; bg: string }[] = []
    const days = customer.last_order_at
        ? Math.floor((Date.now() - new Date(customer.last_order_at).getTime()) / 86400000)
        : 999

    // VIP: top 20% por gasto (requiere al menos 5 clientes para tener sentido)
    if (allCustomers.length >= 5) {
        const sorted = [...allCustomers].sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
        const vipIdx = Math.max(0, Math.ceil(allCustomers.length * 0.2) - 1)
        if (Number(customer.total_spent) >= Number(sorted[vipIdx]?.total_spent) && Number(customer.total_spent) > 0) {
            tags.push({ label: '⭐ VIP', color: 'text-yellow-800', bg: 'bg-yellow-100' })
        }
    }

    // Inactivo: sin pedir hace 60+ días
    if (days >= 60) {
        tags.push({ label: '😴 Inactivo', color: 'text-red-700', bg: 'bg-red-100' })
        // En riesgo: 20-59 días y tenía historial
    } else if (days >= 20 && customer.total_orders >= 2) {
        tags.push({ label: '⚠️ En riesgo', color: 'text-orange-700', bg: 'bg-orange-100' })
    }

    // Frecuente: 3+ pedidos y activo
    if (customer.total_orders >= 3 && days < 60) {
        tags.push({ label: '🔄 Frecuente', color: 'text-blue-700', bg: 'bg-blue-100' })
    } else if (customer.total_orders === 1) {
        tags.push({ label: '🆕 Nuevo', color: 'text-emerald-700', bg: 'bg-emerald-100' })
    }

    return tags
}

// --- Días desde el último pedido ---
function getDaysSince(lastOrderAt: string | null): number | null {
    if (!lastOrderAt) return null
    return Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86400000)
}

import { callAI as callAIService } from '../../services/aiService'

const TAG_FILTERS = ['Todos', 'VIP', 'Frecuente', 'En riesgo', 'Inactivo', 'Nuevo']


type MessageGoal = 'thankyou' | 'discount' | 'reminder' | 'reactivation'

const MESSAGE_GOAL_OPTIONS: { key: MessageGoal; label: string; prompt: string }[] = [
    { key: 'thankyou', label: 'Agradecimiento', prompt: 'objetivo: agradecer la compra reciente y reforzar confianza para próxima compra.' },
    { key: 'discount', label: 'Descuento', prompt: 'objetivo: comunicar promoción/descuento con sentido de oportunidad y CTA claro.' },
    { key: 'reminder', label: 'Recordatorio', prompt: 'objetivo: recordar productos o reposición de compra de forma útil y no invasiva.' },
    { key: 'reactivation', label: 'Reactivación', prompt: 'objetivo: recuperar cliente inactivo con tono cercano y propuesta de valor.' },
]


const SEGMENT_RULES = [
    '⭐ VIP: top 20% por gasto total (si hay al menos 5 clientes).',
    '🔄 Frecuente: 3 o más pedidos y activo (< 60 días).',
    '⚠️ En riesgo: 20-59 días sin comprar y al menos 2 pedidos históricos.',
    '😴 Inactivo: 60+ días sin comprar.',
    '🆕 Nuevo: primer pedido registrado (1 pedido).',
]

function inferRecommendedGoal(customer: Customer, allCustomers: Customer[]): MessageGoal {
    const tags = getCustomerTags(customer, allCustomers).map(tag => tag.label)

    if (tags.some(tag => tag.includes('Inactivo'))) return 'reactivation'
    if (tags.some(tag => tag.includes('En riesgo'))) return 'discount'
    if (tags.some(tag => tag.includes('Frecuente'))) return 'reminder'
    if (tags.some(tag => tag.includes('VIP'))) return 'discount'

    return 'thankyou'
}

// ─── Chat IA types ────────────────────────────────────────────────────────
interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
}

const QUICK_CHIPS = [
    '¿Quiénes son mis mejores clientes?',
    'Clientes sin compras hace 30 días',
    'Segmentá por ticket promedio',
]

function CrmIaPageInner() {
    const navigate = useNavigate()
    const { selectedStoreId, subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [tagFilter, setTagFilter] = useState('Todos')
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

    // Estado de modales
    const [isEditingNotes, setIsEditingNotes] = useState(false)
    const [isViewingOrders, setIsViewingOrders] = useState(false)
    const [isAIAnalysis, setIsAIAnalysis] = useState(false)
    const [isAIMessage, setIsAIMessage] = useState(false)

    // Notas
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    // Pedidos del cliente
    const [customerOrders, setCustomerOrders] = useState<{ id: string; order_number: number; total: number; status: string; created_at: string }[]>([])
    const [loadingOrders, setLoadingOrders] = useState(false)

    // IA
    const [aiAnalysisText, setAiAnalysisText] = useState('')
    const [aiMessageText, setAiMessageText] = useState('')
    const [loadingAI, setLoadingAI] = useState(false)
    const [copied, setCopied] = useState(false)
    const [messageGoal, setMessageGoal] = useState<MessageGoal>('thankyou')
    const [storeSignature, setStoreSignature] = useState('Tu tienda')

    // ─── Chat IA state ────────────────────────────────────────────────────
    const [chatOpen, setChatOpen] = useState(true)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [chatTyping, setChatTyping] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    useEffect(() => {
        loadCustomers()
    }, [selectedStoreId])

    useEffect(() => {
        tenantApi.getMe()
            .then((store) => {
                setStoreSignature(store.name?.trim() || 'Tu tienda')
            })
            .catch(() => {
                setStoreSignature('Tu tienda')
            })
    }, [selectedStoreId])

    const loadCustomers = () => {
        setLoading(true)
        customersApi.list({ limit: 200 })
            .then(res => {
                setCustomers(res.data)
                // Set initial chat message once customers load
                if (res.data.length > 0 && chatMessages.length === 0) {
                    const totalSpent = res.data.reduce((acc: number, c: Customer) => acc + (Number(c.total_spent) || 0), 0)
                    const totalOrders = res.data.reduce((acc: number, c: Customer) => acc + (Number(c.total_orders) || 0), 0)
                    const avgT = totalOrders > 0 ? totalSpent / totalOrders : 0
                    const vips = res.data.filter((c: Customer) => getCustomerTags(c, res.data).some(t => t.label.includes('VIP'))).length
                    const inactive = res.data.filter((c: Customer) => getCustomerTags(c, res.data).some(t => t.label.includes('Inactivo'))).length
                    const atRisk = res.data.filter((c: Customer) => getCustomerTags(c, res.data).some(t => t.label.includes('riesgo'))).length

                    setChatMessages([{
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `¡Hola! Soy tu asistente de CRM. Tengo cargados ${res.data.length} clientes.\n\n` +
                            `📊 **Resumen:** ${formatPrice(totalSpent)} facturado | Ticket prom: ${formatPrice(avgT)}\n` +
                            `⭐ ${vips} VIP | ⚠️ ${atRisk} en riesgo | 😴 ${inactive} inactivos\n\n` +
                            `Preguntame sobre tus clientes, segmentación o estrategias de retención.`
                    }])
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    // ─── Chat IA logic ────────────────────────────────────────────────────
    const buildChatSystemPrompt = useCallback((): string => {
        const totalSpent = customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0)
        const totalOrders = customers.reduce((acc, c) => acc + (Number(c.total_orders) || 0), 0)
        const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0

        const customerList = customers.map(c => {
            const days = c.last_order_at
                ? Math.floor((Date.now() - new Date(c.last_order_at).getTime()) / 86400000)
                : null
            const tags = getCustomerTags(c, customers).map(t => t.label.replace(/[⭐🔄⚠️😴🆕]\s?/, '')).join(', ')
            const cAvg = c.total_orders > 0 ? Number(c.total_spent) / c.total_orders : 0
            return `- ${c.name} | WA: ${c.whatsapp} | Pedidos: ${c.total_orders} | Total: ${formatPrice(Number(c.total_spent))} | Ticket: ${formatPrice(cAvg)} | Días s/comprar: ${days ?? 'sin pedidos'} | Tags: ${tags || 'ninguno'}${c.notes ? ` | Notas: ${c.notes}` : ''}`
        }).join('\n')

        return `Sos el asistente de CRM inteligente de una tienda de ecommerce latinoamericana. Tenés acceso a TODOS los datos reales de los clientes.

CONTEXTO ACTUAL:
- Total clientes: ${customers.length}
- Total facturado: ${formatPrice(totalSpent)}
- Total pedidos: ${totalOrders}
- Ticket promedio general: ${formatPrice(avgTicket)}

REGLAS DE SEGMENTACIÓN:
- VIP: top 20% por gasto total (si hay al menos 5 clientes)
- Frecuente: 3+ pedidos y activo (< 60 días sin comprar)
- En riesgo: 20-59 días sin comprar y al menos 2 pedidos históricos
- Inactivo: 60+ días sin comprar
- Nuevo: primer pedido registrado (1 pedido)

BASE DE CLIENTES COMPLETA:
${customerList}

INSTRUCCIONES:
- Respondé en español, de forma directa y concisa
- Usá los datos reales para responder
- Podés hacer cálculos, rankings y recomendaciones
- Si te piden segmentar, usá las reglas o creá segmentos ad-hoc
- Si te piden generar mensajes de WhatsApp, crealos personalizados
- Cuando muestres rankings o listas, usá formato legible con emojis
- Podés sugerir acciones concretas: enviar ofertas, reactivar inactivos, premiar VIPs
- No inventes datos ni clientes que no existan en la base`
    }, [customers])

    const handleChatSend = async (overrideInput?: string) => {
        const query = (overrideInput ?? chatInput).trim()
        if (!query || chatTyping) return

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query }
        setChatMessages(prev => [...prev, userMsg])
        setChatInput('')
        setChatTyping(true)

        try {
            if (customers.length === 0) {
                setChatMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Todavía estoy cargando los datos de clientes. Esperá un momento...'
                }])
                return
            }

            const systemPrompt = buildChatSystemPrompt()
            const history = chatMessages.slice(-10).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }))

            const aiText = await callAIService([
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: query }
            ], plan)

            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: aiText
            }])
        } catch (err) {
            console.error('AI Error:', err)
            showToast('error', 'Error al consultar la IA')
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Ocurrió un error. Intentá de nuevo.'
            }])
        } finally {
            setChatTyping(false)
        }
    }

    // ─── Original CRM handlers ───────────────────────────────────────────
    const handleUpdateNotes = async () => {
        if (!selectedCustomer) return
        setSaving(true)
        try {
            await customersApi.updateNotes(selectedCustomer.id, notes)
            showToast('success', 'Notas actualizadas')
            setIsEditingNotes(false)
            loadCustomers()
        } catch {
            showToast('error', 'No se pudieron guardar las notas')
        } finally {
            setSaving(false)
        }
    }

    const handleViewOrders = async (customer: Customer) => {
        setSelectedCustomer(customer)
        setIsViewingOrders(true)
        setLoadingOrders(true)
        try {
            const orders = await customersApi.getOrdersByWhatsapp(customer.whatsapp)
            setCustomerOrders(orders)
        } catch {
            showToast('error', 'No se pudieron cargar los pedidos')
        } finally {
            setLoadingOrders(false)
        }
    }

    const handleOpenOrderDetail = (orderId: string) => {
        setIsViewingOrders(false)
        setCustomerOrders([])
        navigate(`/orders/${orderId}`)
    }

    const handleAIAnalysis = async (customer: Customer) => {
        setSelectedCustomer(customer)
        setAiAnalysisText('')
        setIsAIAnalysis(true)
        setLoadingAI(true)
        const days = getDaysSince(customer.last_order_at) ?? 'desconocido'
        const avgTicket = customer.total_orders > 0
            ? (Number(customer.total_spent) / customer.total_orders).toFixed(0)
            : 0
        try {
            const text = await callAIService([
                { role: 'system', content: `Eres un analista de CRM experto para una tienda online latinoamericana. Analiza el perfil del cliente y genera un resumen de 3-4 oraciones que incluya: comportamiento de compra, valor para el negocio, y una recomendación concreta de acción. Escribe en español, tono profesional pero cálido.` },
                { role: 'user', content: `Cliente: ${customer.name}
Pedidos totales: ${customer.total_orders}
Total gastado: $${Number(customer.total_spent).toLocaleString('es-AR')}
Ticket promedio: $${Number(avgTicket).toLocaleString('es-AR')}
Días desde último pedido: ${days}
Notas internas: ${customer.notes || 'ninguna'}` }
            ], plan)
            setAiAnalysisText(text)
        } catch {
            showToast('error', 'Error al consultar la IA')
            setIsAIAnalysis(false)
        } finally {
            setLoadingAI(false)
        }
    }

    const appendStoreSignature = (message: string) => {
        const cleanMessage = message.trim()
        const signatureLine = `— ${storeSignature}`

        if (cleanMessage.toLowerCase().includes(signatureLine.toLowerCase())) {
            return cleanMessage
        }

        return `${cleanMessage}

${signatureLine}`
    }

    const handleAIMessage = async (customer: Customer, goal?: MessageGoal) => {
        const resolvedGoal = goal || inferRecommendedGoal(customer, customers)
        setSelectedCustomer(customer)
        setMessageGoal(resolvedGoal)
        setCopied(false)
        setAiMessageText('')
        setIsAIMessage(true)
        setLoadingAI(true)
        const days = getDaysSince(customer.last_order_at) ?? 'varios'
        const selectedGoal = MESSAGE_GOAL_OPTIONS.find(option => option.key === resolvedGoal)
        try {
            const text = await callAIService([
                { role: 'system', content: `Eres un experto en marketing conversacional para ecommerce latinoamericano. Genera un mensaje de WhatsApp personalizado, cálido y natural (NO genérico ni corporativo) para reconectar con el cliente. El mensaje debe ser corto (máximo 3 oraciones), usar el nombre del cliente, incluir ${selectedGoal?.prompt || 'objetivo comercial claro'} y cerrar con una firma en línea final con formato: — ${storeSignature}. Responde SOLO con el texto del mensaje, listo para copiar y enviar. No uses asteriscos ni markdown.` },
                { role: 'user', content: `Nombre del cliente: ${customer.name}
Objetivo del mensaje: ${selectedGoal?.label || 'Agradecimiento'}
Pedidos realizados: ${customer.total_orders}
Días sin comprar: ${days}
Notas del vendedor: ${customer.notes || 'ninguna'}
Firma de la tienda obligatoria: — ${storeSignature}` }
            ], plan)
            setAiMessageText(appendStoreSignature(text))
        } catch {
            showToast('error', 'Error al consultar la IA')
            setIsAIMessage(false)
        } finally {
            setLoadingAI(false)
        }
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Filtrado por búsqueda y etiqueta
    const filtered = customers.filter(c => {
        const matchSearch =
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.whatsapp.includes(search)
        if (!matchSearch) return false
        if (tagFilter === 'Todos') return true
        const tags = getCustomerTags(c, customers)
        return tags.some(t => t.label.includes(tagFilter))
    })


    const selectedCustomerDays = selectedCustomer ? getDaysSince(selectedCustomer.last_order_at) : null
    const selectedCustomerAvgTicket = selectedCustomer && selectedCustomer.total_orders > 0
        ? Number(selectedCustomer.total_spent) / selectedCustomer.total_orders
        : 0

    // Métricas
    const totalSpent = customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0)
    const totalOrders = customers.reduce((acc, c) => acc + (Number(c.total_orders) || 0), 0)
    const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0
    const frecuentes = customers.filter(c => c.total_orders > 1).length

    return (
        <div className="space-y-6">
            {/* ═══ SECCIÓN: Asistente IA Chat ═══ */}
            <Card padding={false}>
                {/* Chat header - siempre visible, toggle */}
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900">CRM IA</h2>
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">
                                    IA Activa · Conocé a tus clientes, segmentalos y ejecutá acciones
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span
                            onClick={(e) => { e.stopPropagation(); navigate('/orders') }}
                            className="hidden sm:flex px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            Gestión de tienda
                        </span>
                        {chatOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                </button>

                {chatOpen && (
                    <div className="border-t border-slate-100">
                        {/* Quick chips */}
                        <div className="flex items-center gap-2 px-6 py-3 flex-wrap bg-slate-50/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Probá:</span>
                            {QUICK_CHIPS.map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => handleChatSend(chip)}
                                    disabled={chatTyping || loading}
                                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {/* Messages */}
                        <div className="h-80 overflow-y-auto p-6 space-y-3 bg-white">
                            {chatMessages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm'
                                        : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {chatTyping && (
                                <div className="flex items-start">
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm p-3">
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
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                                    placeholder="Escribí un comando para CRM IA..."
                                    disabled={loading}
                                    className="flex-1 bg-white border border-slate-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none shadow-sm disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleChatSend()}
                                    disabled={!chatInput.trim() || chatTyping || loading}
                                    className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                                >
                                    {chatTyping ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* ═══ SECCIÓN ORIGINAL: Gestión de clientes ═══ */}
            <h1 className="text-2xl font-bold text-gray-900">Clientes (CRM)</h1>

            {/* Tarjetas de resumen */}
            {!loading && customers.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Total clientes</p>
                                <p className="text-xl font-bold text-gray-900">{customers.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Total facturado</p>
                                <p className="text-xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Ticket promedio</p>
                                <p className="text-xl font-bold text-gray-900">{formatPrice(avgTicket)}</p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <UserCheck className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Frecuentes</p>
                                <p className="text-xl font-bold text-gray-900">{frecuentes}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Búsqueda + filtros por etiqueta */}
            <Card>
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o WhatsApp..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TAG_FILTERS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setTagFilter(tag)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${tagFilter === tag
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Cómo se clasifican los clientes</p>
                    <ul className="space-y-1">
                        {SEGMENT_RULES.map((rule) => (
                            <li key={rule} className="text-sm text-gray-600">• {rule}</li>
                        ))}
                    </ul>
                    <p className="text-xs text-gray-500">Estas etiquetas son reglas automáticas del CRM (no una decisión arbitraria de IA) y se usan para sugerir el mejor tipo de mensaje.</p>
                </div>
            </Card>

            {/* Tabla */}
            {loading ? (
                <LoadingSpinner text="Cargando clientes..." />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-16 h-16" />}
                    title="No hay clientes"
                    description="Los clientes aparecerán aquí cuando realicen su primer pedido."
                />
            ) : (
                <Card padding={false}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 uppercase text-[10px] font-black tracking-widest text-gray-400">
                                    <th className="text-left px-6 py-4">Cliente</th>
                                    <th className="text-left px-6 py-4">WhatsApp</th>
                                    <th className="text-center px-6 py-4">Pedidos</th>
                                    <th className="text-right px-6 py-4">Total Invertido</th>
                                    <th className="text-right px-6 py-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((customer) => {
                                    const tags = getCustomerTags(customer, customers)
                                    const days = getDaysSince(customer.last_order_at)
                                    const daysColor = days === null
                                        ? 'text-gray-400'
                                        : days < 7 ? 'text-emerald-600'
                                            : days < 30 ? 'text-amber-600'
                                                : 'text-red-500'
                                    return (
                                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-gray-900">{customer.name}</span>
                                                    {tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {tags.map(tag => (
                                                                <span
                                                                    key={tag.label}
                                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tag.bg} ${tag.color}`}
                                                                >
                                                                    {tag.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-600 font-medium">{customer.whatsapp}</span>
                                                    <span className={`text-[10px] font-medium ${daysColor}`}>
                                                        {days !== null ? `Hace ${days} días` : 'Sin pedidos'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs">
                                                    {customer.total_orders}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-gray-900 font-bold">
                                                    {formatPrice(Number(customer.total_spent))}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => { setSelectedCustomer(customer); setNotes(customer.notes || ''); setIsEditingNotes(true) }}
                                                        className="p-2.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-100"
                                                        title="Notas internas"
                                                    >
                                                        <ClipboardList className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewOrders(customer)}
                                                        className="p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all border border-amber-100"
                                                        title="Ver pedidos"
                                                    >
                                                        <ShoppingBag className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAIAnalysis(customer)}
                                                        className="p-2.5 rounded-xl bg-violet-50/60 hover:bg-violet-100 text-violet-600 hover:text-violet-700 transition-all border border-violet-100"
                                                        title="Análisis IA del cliente"
                                                    >
                                                        <Bot className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAIMessage(customer)}
                                                        className="p-2.5 rounded-xl bg-pink-50/60 hover:bg-pink-100 text-pink-600 hover:text-pink-700 transition-all border border-pink-100"
                                                        title="Generar mensaje WhatsApp con IA"
                                                    >
                                                        <Sparkles className="w-5 h-5" />
                                                    </button>
                                                    <a
                                                        href={whatsappLink(customer.whatsapp)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 transition-all border border-emerald-100"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <MessageSquare className="w-5 h-5" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
)}

            <Card>
                <details>
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-gray-400 select-none">
                        Cómo se clasifican los clientes
                    </summary>
                    <div className="mt-3 space-y-2">
                        <ul className="space-y-1">
                            {SEGMENT_RULES.map((rule) => (
                                <li key={rule} className="text-xs text-gray-600">• {rule}</li>
                            ))}
                        </ul>
                        <p className="text-xs text-gray-500">Estas etiquetas son reglas automáticas del CRM (no una decisión arbitraria de IA) y se usan para sugerir el mejor tipo de mensaje.</p>
                    </div>
                </details>
            </Card>


            {/* Modal: Notas */}
            <Modal
                isOpen={isEditingNotes}
                onClose={() => setIsEditingNotes(false)}
                title={`Notas: ${selectedCustomer?.name}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                            Anotaciones internas
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Cliente recurrente, prefiere envíos por la mañana..."
                            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsEditingNotes(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleUpdateNotes} loading={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            Guardar Notas
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Historial de pedidos */}
            <Modal
                isOpen={isViewingOrders}
                onClose={() => { setIsViewingOrders(false); setCustomerOrders([]) }}
                title={`Pedidos de ${selectedCustomer?.name}`}
            >
                {loadingOrders ? (
                    <LoadingSpinner text="Cargando pedidos..." />
                ) : customerOrders.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">No se encontraron pedidos registrados.</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-500">Doble click en un pedido para abrir su detalle.</p>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {customerOrders.map((order) => {
                            const statusCfg = orderStatusConfig[order.status] || orderStatusConfig.pending
                            return (
                                <div
                                    key={order.id}
                                    onDoubleClick={() => handleOpenOrderDetail(order.id)}
                                    title="Doble click para abrir detalle"
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">#{order.order_number}</p>
                                        <p className="text-xs text-gray-400">{formatShortDate(order.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                                            {statusCfg.label}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {formatPrice(Number(order.total))}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: Análisis IA */}
            <Modal
                isOpen={isAIAnalysis}
                onClose={() => setIsAIAnalysis(false)}
                title={`Análisis IA · ${selectedCustomer?.name}`}
            >
                {loadingAI ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                        <Bot className="w-10 h-10 text-violet-500 animate-pulse" />
                        <p className="text-sm text-gray-500">Analizando perfil del cliente...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Base del análisis</p>
                            <ul className="space-y-1 text-xs text-slate-600">
                                <li>• Pedidos totales: <span className="font-semibold">{selectedCustomer?.total_orders ?? 0}</span></li>
                                <li>• Total gastado: <span className="font-semibold">{formatPrice(Number(selectedCustomer?.total_spent || 0))}</span></li>
                                <li>• Ticket promedio: <span className="font-semibold">{formatPrice(selectedCustomerAvgTicket)}</span></li>
                                <li>• Días sin comprar: <span className="font-semibold">{selectedCustomerDays ?? 'Sin pedidos'}</span></li>
                                <li>• Notas internas: <span className="font-semibold">{selectedCustomer?.notes || 'ninguna'}</span></li>
                            </ul>
                        </div>

                        <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl">
                            <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysisText}</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => handleCopy(aiAnalysisText)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                {copied
                                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Copiado</>
                                    : <><Copy className="w-5 h-5" /> Copiar</>
                                }
                            </button>
                        </div>
                        </div>
                )}
            </Modal>

            {/* Modal: Mensaje WhatsApp con IA */}
            <Modal
                isOpen={isAIMessage}
                onClose={() => setIsAIMessage(false)}
                title={`Mensaje WhatsApp · ${selectedCustomer?.name}`}
            >
                {loadingAI ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                        <Sparkles className="w-10 h-10 text-pink-500 animate-pulse" />
                        <p className="text-sm text-gray-500">Generando mensaje personalizado...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
                            Mensaje generado por IA — revisá antes de enviar
                        </p>

                        <p className="text-xs text-indigo-600 font-semibold">
                            Sugerencia automática según segmento: {MESSAGE_GOAL_OPTIONS.find(option => option.key === messageGoal)?.label}
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {MESSAGE_GOAL_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => selectedCustomer && handleAIMessage(selectedCustomer, option.key)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${messageGoal === option.key
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                {aiMessageText}
                            </p>
                        </div>

                        <p className="text-xs text-gray-500">
                            Firma incluida automáticamente: <span className="font-semibold">— {storeSignature}</span>
                        </p>

                        <div className="flex items-center justify-between gap-3">
                            <a
                                href={whatsappLink(selectedCustomer?.whatsapp || '', aiMessageText)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all"
                            >
                                <MessageSquare className="w-5 h-5" />
                                Abrir en WhatsApp
                            </a>
                            <button
                                onClick={() => handleCopy(aiMessageText)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                {copied
                                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Copiado</>
                                    : <><Copy className="w-5 h-5" /> Copiar</>
                                }
                            </button>
                        </div>
                        </div>
                )}
            </Modal>
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
