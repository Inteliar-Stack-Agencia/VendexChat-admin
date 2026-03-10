import { useState, useEffect } from 'react'
import {
    Users, Search, MessageSquare, ClipboardList, ShoppingBag,
    TrendingUp, UserCheck, DollarSign, Bot, Sparkles, Copy, CheckCircle2
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card, LoadingSpinner, EmptyState, Modal, Button, showToast } from '../../components/common'
import { customersApi } from '../../services/api'
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

function CrmIaPageInner() {
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

    useEffect(() => {
        loadCustomers()
    }, [selectedStoreId])

    const loadCustomers = () => {
        setLoading(true)
        customersApi.list({ limit: 200 })
            .then(res => setCustomers(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

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

    const handleAIMessage = async (customer: Customer) => {
        setSelectedCustomer(customer)
        setAiMessageText('')
        setIsAIMessage(true)
        setLoadingAI(true)
        const days = getDaysSince(customer.last_order_at) ?? 'varios'
        try {
            const text = await callAIService([
                { role: 'system', content: `Eres un experto en marketing conversacional para ecommerce latinoamericano. Genera un mensaje de WhatsApp personalizado, cálido y natural (NO genérico ni corporativo) para reconectar con el cliente. El mensaje debe ser corto (máximo 3 oraciones), usar el nombre del cliente, y tener un call-to-action sutil. Responde SOLO con el texto del mensaje, listo para copiar y enviar. No uses asteriscos ni markdown.` },
                { role: 'user', content: `Nombre del cliente: ${customer.name}
Pedidos realizados: ${customer.total_orders}
Días sin comprar: ${days}
Notas del vendedor: ${customer.notes || 'ninguna'}` }
            ], plan)
            setAiMessageText(text)
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

    // Métricas
    const totalSpent = customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0)
    const totalOrders = customers.reduce((acc, c) => acc + (Number(c.total_orders) || 0), 0)
    const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0
    const frecuentes = customers.filter(c => c.total_orders > 1).length

    return (
        <div className="space-y-6">
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
                                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                                                        title="Notas internas"
                                                    >
                                                        <ClipboardList className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewOrders(customer)}
                                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-amber-600 transition-all border border-transparent hover:border-amber-100"
                                                        title="Ver pedidos"
                                                    >
                                                        <ShoppingBag className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAIAnalysis(customer)}
                                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-violet-600 transition-all border border-transparent hover:border-violet-100"
                                                        title="Análisis IA del cliente"
                                                    >
                                                        <Bot className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAIMessage(customer)}
                                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-pink-600 transition-all border border-transparent hover:border-pink-100"
                                                        title="Generar mensaje WhatsApp con IA"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                    </button>
                                                    <a
                                                        href={whatsappLink(customer.whatsapp)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-emerald-600 transition-all border border-transparent hover:border-emerald-100"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
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
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {customerOrders.map((order) => {
                            const statusCfg = orderStatusConfig[order.status] || orderStatusConfig.pending
                            return (
                                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
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
                                    : <><Copy className="w-4 h-4" /> Copiar</>
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
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                {aiMessageText}
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <a
                                href={whatsappLink(selectedCustomer?.whatsapp || '', aiMessageText)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all"
                            >
                                <MessageSquare className="w-4 h-4" />
                                Abrir en WhatsApp
                            </a>
                            <button
                                onClick={() => handleCopy(aiMessageText)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                {copied
                                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Copiado</>
                                    : <><Copy className="w-4 h-4" /> Copiar</>
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
