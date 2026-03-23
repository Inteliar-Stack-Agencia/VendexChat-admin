import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Percent,
    Plus,
    Search,
    Trash2,
    Calendar,
    ToggleLeft,
    ToggleRight,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Tag,
    Clock,
    DollarSign
} from 'lucide-react'
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'
import { couponsApi, tenantApi } from '../../services/api'
import { Coupon, Tenant } from '../../types'
import { formatPrice } from '../../utils/helpers'
import { showToast } from '../../components/common/Toast'
import { useAuth } from '../../contexts/AuthContext'

export default function CouponsPage() {
    const { selectedStoreId } = useAuth()
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const [couponsList, tenantData] = await Promise.all([
                couponsApi.list(),
                tenantApi.getMe()
            ])
            setCoupons(couponsList)
            setTenant(tenantData)
        } catch {
            showToast('error', 'No se pudieron cargar los cupones')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [selectedStoreId])

    const handleToggleGlobal = async () => {
        if (!tenant) return
        setIsUpdating(true)
        try {
            const newValue = !tenant.coupons_enabled
            await couponsApi.toggleGlobal(newValue)
            setTenant({ ...tenant, coupons_enabled: newValue })
            showToast('success', newValue ? 'Cupones habilitados globalmente' : 'Cupones deshabilitados')
        } catch {
            showToast('error', 'Error al cambiar estado global')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cupón?')) return
        try {
            await couponsApi.delete(id)
            setCoupons(prev => prev.filter(c => c.id !== id))
            showToast('success', 'Cupón eliminado')
        } catch {
            showToast('error', 'Error al eliminar cupón')
        }
    }

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase())
    )

    const getCouponTypeLabel = (type: number) => {
        switch (type) {
            case 1: return '% Todos los Productos'
            case 2: return '$ Todos los Productos'
            case 3: return '% Productos Seleccionados'
            case 4: return '$ Productos Seleccionados'
            case 5: return '% Categorías Seleccionadas'
            case 6: return '$ Categorías Seleccionadas'
            default: return 'Descuento'
        }
    }

    const isExpired = (endDate: string | null) => {
        if (!endDate) return false
        return new Date(endDate) < new Date()
    }

    return (
        <FeatureGuard feature="coupons" minPlan="pro">
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                <Tag className="w-5 h-5 text-white" />
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-black uppercase text-[9px]">FIDELIZACIÓN</Badge>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Cupones de Descuento</h1>
                        <p className="text-slate-500 font-medium mt-1">Generá promociones irresistibles para aumentar tus ventas en WhatsApp.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {tenant?.coupons_enabled ? 'Cupones Activos' : 'Cupones Pausados'}
                            </span>
                            <button
                                onClick={handleToggleGlobal}
                                disabled={isUpdating}
                                className={`transition-all ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {tenant?.coupons_enabled ? (
                                    <ToggleRight className="w-8 h-8 text-emerald-500 cursor-pointer" />
                                ) : (
                                    <ToggleLeft className="w-8 h-8 text-slate-300 cursor-pointer" />
                                )}
                            </button>
                        </div>
                        <Link to="/coupons/new">
                            <Button className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-100">
                                <Plus className="w-4 h-4" /> Nuevo Cupón
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Banner de Ayuda */}
                <Card className="p-6 bg-slate-50 border-2 border-slate-100/50">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            En esta sección podés generar cupones para toda la tienda, productos seleccionados o categorías específicas.
                            Asignales vigencia, tope de usos y fijá un mínimo de compra para que tus clientes puedan activarlos al realizar su pedido.
                        </p>
                    </div>
                </Card>

                {/* Filtros */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar cupón por nombre o código..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border-2 border-slate-100 focus:border-emerald-500 transition-all text-sm font-bold shadow-sm outline-none"
                    />
                </div>

                {loading ? (
                    <LoadingSpinner text="Cargando tus campañas..." />
                ) : filteredCoupons.length === 0 ? (
                    <EmptyState
                        title={search ? "No se encontraron resultados" : "Sin cupones todavía"}
                        description={search ? "Probá con otro código o limpiá el buscador." : "Empezá creando tu primer cupón de descuento para fidelizar a tus clientes."}
                        action={!search && (
                            <Link to="/coupons/new">
                                <Button className="bg-emerald-600">Crear Mi Primer Cupón</Button>
                            </Link>
                        )}
                    />
                ) : (
                    <Card padding={false} className="border-2 border-slate-100 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                        <th className="px-8 py-5 text-left">Cupón</th>
                                        <th className="px-8 py-5 text-left">Tipo / Descuento</th>
                                        <th className="px-8 py-5 text-left">Desde / Hasta</th>
                                        <th className="px-8 py-5 text-center">Usos</th>
                                        <th className="px-8 py-5 text-left">Condición</th>
                                        <th className="px-8 py-5 text-center">Estado</th>
                                        <th className="px-8 py-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredCoupons.map((coupon) => {
                                        const expired = isExpired(coupon.end_date)
                                        const limitReached = coupon.usage_limit ? coupon.usage_count >= coupon.usage_limit : false
                                        const active = coupon.is_active && !expired && !limitReached

                                        return (
                                            <tr key={coupon.id} className="group hover:bg-slate-50/50 transition-all">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            <Tag className="w-5 h-5" />
                                                        </div>
                                                        <span className="font-black text-slate-900 text-base tracking-tight">{coupon.code}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{getCouponTypeLabel(coupon.type)}</p>
                                                    <div className="flex items-center gap-1.5 font-black text-lg text-emerald-600">
                                                        {coupon.type % 2 === 1 ? (
                                                            <><Percent className="w-4 h-4" /> {coupon.value}% OFF</>
                                                        ) : (
                                                            <><DollarSign className="w-4 h-4" /> {formatPrice(coupon.value)} OFF</>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {new Date(coupon.start_date).toLocaleDateString()}
                                                        </div>
                                                        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase ${expired ? 'text-rose-500' : 'text-slate-400'}`}>
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString() : 'Sin fin'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-slate-800">{coupon.usage_count}</span>
                                                        <span className="text-[9px] font-black uppercase text-slate-400">
                                                            de {coupon.usage_limit || '∞'}
                                                        </span>
                                                        {limitReached && <Badge className="mt-1 bg-red-100 text-red-600 border-0 text-[7px] uppercase">Agotado</Badge>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Min. compra</p>
                                                    <span className="font-black text-slate-800">{formatPrice(coupon.min_purchase_amount)}</span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    {active ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                            <span className="text-[8px] font-black uppercase text-emerald-600">Activo</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <XCircle className="w-5 h-5 text-slate-300" />
                                                            <span className="text-[8px] font-black uppercase text-slate-400">Inactivo</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleDelete(coupon.id)}
                                                            className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
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
            </div>
        </FeatureGuard>
    )
}
