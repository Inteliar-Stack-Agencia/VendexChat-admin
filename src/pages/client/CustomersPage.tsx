import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, MessageSquare, ClipboardList, ShoppingBag, TrendingUp, UserCheck, DollarSign, Trash2 } from 'lucide-react'
import { Card, LoadingSpinner, EmptyState, Modal, Button, showToast, Pagination, ConfirmDialog } from '../../components/common'
import { customersApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, formatShortDate, whatsappLink, orderStatusConfig } from '../../utils/helpers'
import type { Customer } from '../../types'

export default function CustomersPage() {
    const navigate = useNavigate()
    const { selectedStoreId } = useAuth()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [isEditingNotes, setIsEditingNotes] = useState(false)
    const [isViewingOrders, setIsViewingOrders] = useState(false)
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [activeSegment, setActiveSegment] = useState<'all' | 'vip' | 'frequent' | 'new' | 'atRisk' | 'inactive'>('all')
    const [customerOrders, setCustomerOrders] = useState<{ id: string; order_number: number; total: number; status: string; created_at: string }[]>([])
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        loadCustomers()
    }, [selectedStoreId, debouncedSearch, page])

    const loadCustomers = () => {
        setLoading(true)
        customersApi.list({ page, limit: 50, search: debouncedSearch })
            .then(res => {
                setCustomers(res.data)
                setTotalPages(res.total_pages)
            })
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
        } catch (err) {
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
        } catch (err) {
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
    // Métricas calculadas en el cliente (solo sobre la página actual o aproximadas)
    // Nota: Para precisión absoluta deberían venir del servidor, pero para feedback visual sirve.



    const handleDeleteCustomer = async () => {
        if (!customerToDelete) return
        setDeletingCustomerId(customerToDelete.id)
        try {
            await customersApi.remove(customerToDelete.id)
            showToast('success', 'Cliente eliminado')
            setCustomerToDelete(null)
            loadCustomers()
        } catch {
            showToast('error', 'No se pudo eliminar el cliente')
        } finally {
            setDeletingCustomerId(null)
        }
    }

    const getDaysSinceLastOrder = (lastOrderAt?: string | null) => {
        if (!lastOrderAt) return Number.POSITIVE_INFINITY
        const diff = Date.now() - new Date(lastOrderAt).getTime()
        return Math.floor(diff / (1000 * 60 * 60 * 24))
    }

    const getCustomerSegment = (customer: Customer) => {
        const orders = Number(customer.total_orders) || 0
        const spent = Number(customer.total_spent) || 0
        const daysSinceLastOrder = getDaysSinceLastOrder(customer.last_order_at)

        if (orders >= 5 || spent >= 150000) {
            return {
                key: 'vip',
                label: 'VIP',
                className: 'bg-violet-100 text-violet-700'
            }
        }

        if (orders >= 3) {
            return {
                key: 'frequent',
                label: 'Frecuente',
                className: 'bg-blue-100 text-blue-700'
            }
        }

        if (orders <= 1 && daysSinceLastOrder <= 7) {
            return {
                key: 'new',
                label: 'Nuevo',
                className: 'bg-emerald-100 text-emerald-700'
            }
        }

        if (daysSinceLastOrder > 60) {
            return {
                key: 'inactive',
                label: 'Inactivo',
                className: 'bg-slate-100 text-slate-700'
            }
        }

        if (daysSinceLastOrder > 30) {
            return {
                key: 'atRisk',
                label: 'En riesgo',
                className: 'bg-amber-100 text-amber-700'
            }
        }

        return {
            key: 'all',
            label: 'Activo',
            className: 'bg-teal-100 text-teal-700'
        }
    }



    const segmentRules = [
        'VIP: 5+ pedidos o $150.000+ gastados',
        'Frecuente: 3-4 pedidos',
        'Nuevo: 1 pedido y último pedido en <= 7 días',
        'En riesgo: más de 30 días sin comprar',
        'Inactivo: más de 60 días sin comprar',
    ]
    const filteredCustomers = useMemo(() => {
        if (activeSegment === 'all') return customers
        return customers.filter(customer => getCustomerSegment(customer).key === activeSegment)
    }, [customers, activeSegment])

    const segmentCounts = useMemo(() => ({
        all: customers.length,
        vip: customers.filter(c => getCustomerSegment(c).key === 'vip').length,
        frequent: customers.filter(c => getCustomerSegment(c).key === 'frequent').length,
        new: customers.filter(c => getCustomerSegment(c).key === 'new').length,
        atRisk: customers.filter(c => getCustomerSegment(c).key === 'atRisk').length,
        inactive: customers.filter(c => getCustomerSegment(c).key === 'inactive').length,
    }), [customers])

    // Métricas calculadas en el cliente
    const totalSpent = customers.reduce((acc, c) => acc + (Number(c.total_spent) || 0), 0)
    const totalOrders = customers.reduce((acc, c) => acc + (Number(c.total_orders) || 0), 0)
    const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0
    const frecuentes = customers.filter(c => c.total_orders > 1).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Clientes (CRM)</h1>
            </div>

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

            {/* Búsqueda */}
            <Card>
                <div className="space-y-4">
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

                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { key: 'all', label: 'Todos' },
                            { key: 'vip', label: 'VIP' },
                            { key: 'frequent', label: 'Frecuente' },
                            { key: 'atRisk', label: 'En riesgo' },
                            { key: 'inactive', label: 'Inactivo' },
                            { key: 'new', label: 'Nuevo' },
                        ].map(segment => (
                            <button
                                key={segment.key}
                                onClick={() => setActiveSegment(segment.key as typeof activeSegment)}
                                className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
                                    activeSegment === segment.key
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
                                }`}
                            >
                                {segment.label} ({segmentCounts[segment.key as keyof typeof segmentCounts]})
                            </button>
                        ))}
                    </div>

                    <p className="text-xs text-gray-500 font-medium">
                        Mostrando {filteredCustomers.length} de {customers.length} clientes.
                    </p>

                    <p className="text-xs text-gray-500">
                        Criterios: {segmentRules.join(' · ')}.
                    </p>
                </div>
            </Card>

            {loading && customers.length === 0 ? (
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
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 rounded mb-1" /><div className="h-3 w-20 bg-slate-50 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-6 w-10 bg-slate-100 rounded-full mx-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-slate-100 rounded ml-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-8 w-24 bg-slate-50 rounded-lg ml-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : customers.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-16 h-16" />}
                    title="No hay clientes"
                    description="Los clientes aparecerán aquí cuando realicen su primer pedido."
                />
            ) : filteredCustomers.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-16 h-16" />}
                    title="No hay clientes para este segmento"
                    description="Probá cambiar el filtro para ver otros clientes."
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
                                {filteredCustomers.map((customer) => {
                                    const segment = getCustomerSegment(customer)
                                    return (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{customer.name}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${segment.className}`}>
                                                        {segment.label}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    Último: {customer.last_order_at ? formatShortDate(customer.last_order_at) : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600 font-medium">{customer.whatsapp}</span>
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomer(customer)
                                                        setNotes(customer.notes || '')
                                                        setIsEditingNotes(true)
                                                    }}
                                                    className="p-2.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-100"
                                                    title="Notas del cliente"
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
                                                    onClick={() => setCustomerToDelete(customer)}
                                                    className="p-2.5 rounded-xl bg-rose-50/60 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-all border border-rose-100"
                                                    title="Eliminar cliente"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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
                                )})}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </div>
                    )}
                </Card>
            )}

            {/* Modal de Notas */}
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
                        <Button
                            variant="primary"
                            onClick={handleUpdateNotes}
                            loading={saving}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Guardar Notas
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Ver Pedidos del cliente */}
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
            <ConfirmDialog
                isOpen={!!customerToDelete}
                onClose={() => setCustomerToDelete(null)}
                onConfirm={handleDeleteCustomer}
                loading={deletingCustomerId === customerToDelete?.id}
                title="Eliminar cliente"
                message={`¿Seguro que quieres eliminar a ${customerToDelete?.name || 'este cliente'}? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                confirmVariant="danger"
            />
        </div>
    )
}
