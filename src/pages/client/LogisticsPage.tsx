import { useState, useEffect } from 'react'
import {
    Truck, MapPin, Plus, Trash2, Save, Package,
    CheckCircle, Clock, User, Phone, ChevronRight,
    ToggleLeft, ToggleRight, Loader2, AlertCircle
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card, Button, LoadingSpinner, Modal, showToast } from '../../components/common'
import { tenantApi, ordersApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatPrice, formatShortDate } from '../../utils/helpers'
import type { Tenant, Order } from '../../types'
import { supabase } from '../../supabaseClient'

// --- Tipos internos ---
interface DeliveryZone {
    id: string
    name: string
    cost: number
    is_active: boolean
}

interface Driver {
    id: string
    name: string
    phone: string
}

interface DeliveryOrder extends Order {
    delivery_driver?: string
    delivery_status?: 'pending' | 'dispatched' | 'delivered'
}

// ============================================================
// Componente principal (inner)
// ============================================================
function LogisticsPageInner() {
    const { selectedStoreId } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [zones, setZones] = useState<DeliveryZone[]>([])
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [orders, setOrders] = useState<DeliveryOrder[]>([])
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [activeTab, setActiveTab] = useState<'queue' | 'zones' | 'drivers'>('queue')

    // New zone form
    const [newZoneName, setNewZoneName] = useState('')
    const [newZoneCost, setNewZoneCost] = useState('')

    // New driver form
    const [newDriverName, setNewDriverName] = useState('')
    const [newDriverPhone, setNewDriverPhone] = useState('')

    // Dispatch modal
    const [dispatchOrder, setDispatchOrder] = useState<DeliveryOrder | null>(null)
    const [selectedDriver, setSelectedDriver] = useState('')
    const [dispatching, setDispatching] = useState(false)

    // ---- Load ----
    useEffect(() => {
        loadData()
    }, [selectedStoreId])

    const loadData = async () => {
        setLoading(true)
        try {
            const t = await tenantApi.getMe()
            setTenant(t)
            setZones((t.metadata?.delivery_zones ?? []) as DeliveryZone[])
            setDrivers((t.metadata?.delivery_drivers ?? []) as Driver[])
        } catch {
            showToast('error', 'Error al cargar configuración')
        } finally {
            setLoading(false)
        }
        loadOrders()
    }

    const loadOrders = async () => {
        setLoadingOrders(true)
        try {
            const res = await ordersApi.list({ status: 'confirmed', limit: 50 })
            // Only delivery orders (have delivery_address)
            const deliveryOrders = res.data.filter((o) => o.customer_address)
            // Enrich with metadata delivery fields
            const enriched: DeliveryOrder[] = deliveryOrders.map((o) => ({
                ...o,
                delivery_driver: (o.metadata?.delivery_driver as string | undefined) || '',
                delivery_status: (o.metadata?.delivery_status as DeliveryOrder['delivery_status'] | undefined) || 'pending',
            }))
            setOrders(enriched)
        } catch {
            showToast('error', 'Error al cargar pedidos')
        } finally {
            setLoadingOrders(false)
        }
    }

    const handleSaveConfig = async () => {
        if (!tenant) return
        setSaving(true)
        try {
            await tenantApi.updateMe({
                metadata: {
                    ...tenant.metadata,
                    delivery_zones: zones,
                    delivery_drivers: drivers,
                },
            })
            showToast('success', 'Configuración de logística guardada')
        } catch {
            showToast('error', 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    // --- Zones ---
    const handleAddZone = () => {
        if (!newZoneName.trim()) {
            showToast('error', 'Ingresá el nombre de la zona')
            return
        }
        const cost = parseFloat(newZoneCost) || 0
        setZones((prev) => [
            ...prev,
            { id: Date.now().toString(), name: newZoneName.trim(), cost, is_active: true },
        ])
        setNewZoneName('')
        setNewZoneCost('')
    }

    const handleToggleZone = (id: string) => {
        setZones((prev) => prev.map((z) => (z.id === id ? { ...z, is_active: !z.is_active } : z)))
    }

    const handleDeleteZone = (id: string) => {
        setZones((prev) => prev.filter((z) => z.id !== id))
    }

    // --- Drivers ---
    const handleAddDriver = () => {
        if (!newDriverName.trim()) {
            showToast('error', 'Ingresá el nombre del repartidor')
            return
        }
        setDrivers((prev) => [
            ...prev,
            { id: Date.now().toString(), name: newDriverName.trim(), phone: newDriverPhone.trim() },
        ])
        setNewDriverName('')
        setNewDriverPhone('')
    }

    const handleDeleteDriver = (id: string) => {
        setDrivers((prev) => prev.filter((d) => d.id !== id))
    }

    // --- Dispatch ---
    const handleDispatch = async () => {
        if (!dispatchOrder || !selectedDriver) {
            showToast('error', 'Seleccioná un repartidor')
            return
        }
        setDispatching(true)
        try {
            await supabase
                .from('orders')
                .update({
                    metadata: {
                        ...(dispatchOrder.metadata || {}),
                        delivery_driver: selectedDriver,
                        delivery_status: 'dispatched',
                        dispatched_at: new Date().toISOString(),
                    },
                })
                .eq('id', dispatchOrder.id)

            showToast('success', `Pedido #${dispatchOrder.order_number} despachado a ${selectedDriver}`)
            setDispatchOrder(null)
            setSelectedDriver('')
            loadOrders()
        } catch {
            showToast('error', 'Error al despachar')
        } finally {
            setDispatching(false)
        }
    }

    const handleMarkDelivered = async (order: DeliveryOrder) => {
        try {
            await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    metadata: {
                        ...(order.metadata || {}),
                        delivery_status: 'delivered',
                        delivered_at: new Date().toISOString(),
                    },
                })
                .eq('id', order.id)
            showToast('success', `Pedido #${order.order_number} marcado como entregado`)
            loadOrders()
        } catch {
            showToast('error', 'Error al actualizar')
        }
    }

    if (loading) return <LoadingSpinner text="Cargando logística..." />

    // Stats
    const pendingCount = orders.filter((o) => o.delivery_status === 'pending').length
    const dispatchedCount = orders.filter((o) => o.delivery_status === 'dispatched').length
    const activeZones = zones.filter((z) => z.is_active).length

    // ---- Render ----
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Logística</h1>
                    <p className="text-slate-500 text-sm">
                        Gestioná tus zonas de envío, repartidores y cola de despacho.
                    </p>
                </div>
                <Button
                    onClick={handleSaveConfig}
                    loading={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Guardar Config
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
                            <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Truck className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Reparto</p>
                            <p className="text-2xl font-black text-slate-900">{dispatchedCount}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <MapPin className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zonas activas</p>
                            <p className="text-2xl font-black text-slate-900">{activeZones}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 rounded-xl">
                            <User className="w-5 h-5 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repartidores</p>
                            <p className="text-2xl font-black text-slate-900">{drivers.length}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1">
                {(
                    [
                        { id: 'queue', label: 'Cola de Despacho', icon: Package },
                        { id: 'zones', label: 'Zonas', icon: MapPin },
                        { id: 'drivers', label: 'Repartidores', icon: User },
                    ] as const
                ).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === id
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Icon className="w-3 h-3" />
                        {label}
                        {id === 'queue' && pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[8px] font-black rounded-full px-1.5 py-0.5">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ---- Tab: Cola de Despacho ---- */}
            {activeTab === 'queue' && (
                <div className="space-y-3">
                    {loadingOrders ? (
                        <LoadingSpinner text="Cargando pedidos confirmados..." />
                    ) : orders.length === 0 ? (
                        <Card className="p-12 flex flex-col items-center text-center">
                            <Truck className="w-12 h-12 text-slate-200 mb-3" />
                            <p className="text-slate-400 font-medium text-sm">
                                No hay pedidos con entrega pendiente.
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                                Los pedidos confirmados con dirección aparecerán aquí.
                            </p>
                        </Card>
                    ) : (
                        orders.map((order) => (
                            <Card key={order.id} className="p-5">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Info */}
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-900 text-sm">
                                                #{order.order_number}
                                            </span>
                                            <DeliveryStatusBadge status={order.delivery_status || 'pending'} />
                                        </div>
                                        <p className="text-slate-700 text-sm font-medium">{order.customer_name}</p>
                                        <p className="text-slate-500 text-xs flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {order.customer_address}
                                        </p>
                                        {order.delivery_driver && (
                                            <p className="text-blue-600 text-xs font-bold flex items-center gap-1">
                                                <Truck className="w-3 h-3" />
                                                {order.delivery_driver}
                                            </p>
                                        )}
                                        <p className="text-slate-400 text-[10px]">{formatShortDate(order.created_at)}</p>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right">
                                        <p className="font-black text-slate-900">{formatPrice(order.total)}</p>
                                        <p className="text-slate-400 text-xs">{order.items?.length ?? '?'} ítems</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {order.delivery_status !== 'delivered' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setDispatchOrder(order)
                                                        setSelectedDriver(order.delivery_driver || '')
                                                    }}
                                                    className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest px-3 py-2 rounded-xl"
                                                >
                                                    <Truck className="w-3.5 h-3.5 mr-1" />
                                                    {order.delivery_status === 'dispatched' ? 'Reasignar' : 'Despachar'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkDelivered(order)}
                                                    className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest px-3 py-2 rounded-xl"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                    Entregado
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}

                    {orders.length > 0 && (
                        <button
                            onClick={loadOrders}
                            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest transition-colors mx-auto"
                        >
                            <Loader2 className="w-3 h-3" />
                            Actualizar lista
                        </button>
                    )}
                </div>
            )}

            {/* ---- Tab: Zonas ---- */}
            {activeTab === 'zones' && (
                <div className="space-y-5">
                    {/* Agregar zona */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Nueva Zona</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre de la zona</label>
                                <input
                                    type="text"
                                    value={newZoneName}
                                    onChange={(e) => setNewZoneName(e.target.value)}
                                    placeholder="Ej: Centro, Norte, Zona Sur..."
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="w-full sm:w-40">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Costo de envío</label>
                                <input
                                    type="number"
                                    value={newZoneCost}
                                    onChange={(e) => setNewZoneCost(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleAddZone}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-xl flex items-center gap-2 h-[46px]"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Lista de zonas */}
                    {zones.length === 0 ? (
                        <Card className="p-10 flex flex-col items-center text-center">
                            <MapPin className="w-10 h-10 text-slate-200 mb-3" />
                            <p className="text-slate-400 text-sm font-medium">
                                No hay zonas configuradas. Agregá tu primera zona arriba.
                            </p>
                        </Card>
                    ) : (
                        <Card padding={false}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50 uppercase text-[10px] font-black tracking-widest text-slate-400">
                                            <th className="text-left px-6 py-4">Zona</th>
                                            <th className="text-right px-6 py-4">Costo Envío</th>
                                            <th className="text-center px-6 py-4">Estado</th>
                                            <th className="text-right px-6 py-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {zones.map((zone) => (
                                            <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                                        {zone.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    {zone.cost === 0 ? (
                                                        <span className="text-emerald-600">Gratis</span>
                                                    ) : (
                                                        formatPrice(zone.cost)
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleZone(zone.id)}
                                                        className={`flex items-center gap-1 mx-auto text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${zone.is_active
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-400'
                                                            }`}
                                                    >
                                                        {zone.is_active ? (
                                                            <ToggleRight className="w-3 h-3" />
                                                        ) : (
                                                            <ToggleLeft className="w-3 h-3" />
                                                        )}
                                                        {zone.is_active ? 'Activa' : 'Inactiva'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteZone(zone.id)}
                                                        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {zones.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700 font-medium">
                                Presioná <strong>Guardar Config</strong> para que los cambios en zonas tomen efecto.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ---- Tab: Repartidores ---- */}
            {activeTab === 'drivers' && (
                <div className="space-y-5">
                    {/* Agregar repartidor */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Nuevo Repartidor
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newDriverName}
                                    onChange={(e) => setNewDriverName(e.target.value)}
                                    placeholder="Ej: Carlos Rodríguez"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono (opcional)</label>
                                <input
                                    type="tel"
                                    value={newDriverPhone}
                                    onChange={(e) => setNewDriverPhone(e.target.value)}
                                    placeholder="+54 9 11..."
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleAddDriver}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-xl flex items-center gap-2 h-[46px]"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Lista */}
                    {drivers.length === 0 ? (
                        <Card className="p-10 flex flex-col items-center text-center">
                            <User className="w-10 h-10 text-slate-200 mb-3" />
                            <p className="text-slate-400 text-sm font-medium">
                                No hay repartidores cargados. Agregá el primero arriba.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {drivers.map((driver) => (
                                <Card key={driver.id} className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                                                <User className="w-5 h-5 text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{driver.name}</p>
                                                {driver.phone && (
                                                    <a
                                                        href={`tel:${driver.phone}`}
                                                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        {driver.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDriver(driver.id)}
                                            className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Despachar pedido */}
            <Modal
                isOpen={!!dispatchOrder}
                onClose={() => { setDispatchOrder(null); setSelectedDriver('') }}
                title={`Despachar Pedido #${dispatchOrder?.order_number}`}
            >
                <div className="space-y-5">
                    {/* Info pedido */}
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                        <p className="font-black text-slate-900">{dispatchOrder?.customer_name}</p>
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {dispatchOrder?.customer_address}
                        </p>
                        <p className="font-black text-emerald-600 text-lg">
                            {formatPrice(dispatchOrder?.total || 0)}
                        </p>
                    </div>

                    {/* Selector de repartidor */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                            Asignar Repartidor
                        </label>
                        {drivers.length === 0 ? (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
                                No hay repartidores cargados. Agregá uno en la pestaña Repartidores primero.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {drivers.map((d) => (
                                    <button
                                        key={d.id}
                                        onClick={() => setSelectedDriver(d.name)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedDriver === d.name
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-200'
                                            }`}
                                    >
                                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                            <User className="w-4 h-4 text-violet-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-900 text-sm">{d.name}</p>
                                            {d.phone && <p className="text-slate-400 text-xs">{d.phone}</p>}
                                        </div>
                                        {selectedDriver === d.name && (
                                            <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />
                                        )}
                                    </button>
                                ))}
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 mt-3">
                                        O escribí un nombre manualmente
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedDriver}
                                        onChange={(e) => setSelectedDriver(e.target.value)}
                                        placeholder="Nombre del repartidor..."
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-700 font-medium transition-all outline-none text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => { setDispatchOrder(null); setSelectedDriver('') }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDispatch}
                            loading={dispatching}
                            disabled={!selectedDriver.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl flex items-center gap-2"
                        >
                            <Truck className="w-4 h-4" />
                            Confirmar Despacho
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

// ---- Subcomponente: badge de estado de entrega ----
function DeliveryStatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; className: string }> = {
        pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
        dispatched: { label: 'En Reparto', className: 'bg-blue-100 text-blue-700' },
        delivered: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-700' },
    }
    const c = cfg[status] || cfg.pending
    return (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${c.className}`}>
            {c.label}
        </span>
    )
}

// ============================================================
// Export con FeatureGuard
// ============================================================
export default function LogisticsPage() {
    return (
        <FeatureGuard feature="logistics" minPlan="vip">
            <LogisticsPageInner />
        </FeatureGuard>
    )
}
