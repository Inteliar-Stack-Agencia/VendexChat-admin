import { useState, useEffect } from 'react'
import {
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    Clock,
    CheckCircle,
    AlertCircle,
    User,
    BarChart3,
    Filter,
    Download
} from 'lucide-react'
import { Card, Button, Badge, LoadingSpinner, showToast } from '../../components/common'
import { superadminApi } from '../../services/api'
import type { TrendPoint } from '../../types'

interface PaymentRow {
    id: string;
    tenant: string | null;
    plan: string;
    amount: number;
    status: string;
    date: string;
}

interface LiquidationData {
    revenue_trend: TrendPoint[];
    totals: Awaited<ReturnType<typeof superadminApi.overview>>;
    recent_payments: PaymentRow[];
}

export default function SALiquidationsPage() {
    const [data, setData] = useState<LiquidationData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                // Combinamos con data de overview para los totales reales
                const overview = await superadminApi.overview()
                const subs = await superadminApi.listSubscriptions()
                const orders = await superadminApi.listGlobalOrders({ limit: 5 })

                setData({
                    revenue_trend: [
                        { date: '2024-02-12', value: 10500 },
                        { date: '2024-02-13', value: 11200 },
                        { date: '2024-02-14', value: 10800 },
                        { date: '2024-02-15', value: 12100 },
                        { date: '2024-02-16', value: 13500 },
                        { date: '2024-02-17', value: 12900 },
                        { date: '2024-02-18', value: 14200 },
                    ],
                    totals: overview,
                    recent_payments: orders.data.map((o) => ({
                        id: o.id,
                        tenant: o.store_name,
                        plan: 'Order',
                        amount: o.total,
                        status: o.status,
                        date: o.created_at
                    }))
                })
            } catch (err) {
                console.error('Error loading liquidations data:', err)
                showToast('error', 'Error al cargar datos financieros')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) return <LoadingSpinner text="Calculando ingresos globales..." />
    if (!data) return (
        <div className="p-20 text-center text-slate-400 font-bold">
            Hubo un error al cargar los datos financieros. Por favor, reintenta más tarde.
        </div>
    )

    const stats = [
        { name: 'MRR Actual', value: `$${(data.totals.mrr_estimated || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { name: 'Tiendas Activas', value: data.totals.active_stores, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { name: 'Nuevas (7d)', value: data.totals.new_stores_7d, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { name: 'Total Tiendas', value: data.totals.total_stores, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ]

    return (
        <div className="space-y-10">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Liquidaciones e Ingresos</h2>
                    <p className="text-slate-500 mt-1">Control financiero de suscripciones y comisiones SaaS.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </Button>
                    <Button className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filtros
                    </Button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.name} className="p-6 border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                                <h3 className="text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart Placeholder */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Tendencia de ingresos</h3>
                            <p className="text-sm text-slate-400">Proyección de cobros para los próximos 7 días</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge bg="bg-indigo-50" color="text-indigo-600">Mensual</Badge>
                            <Badge bg="bg-slate-50" color="text-slate-400">Anual</Badge>
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-3 px-2">
                        {data.revenue_trend.map((d: TrendPoint, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div
                                    className="w-full bg-indigo-50 rounded-xl group-hover:bg-indigo-600 transition-all cursor-pointer relative"
                                    style={{ height: `${(d.value / 15000) * 100}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                                        ${d.value.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Liquidation Status */}
                <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <Badge bg="bg-white/20" color="text-white" className="border-0 mb-4 font-black tracking-widest uppercase text-[10px]">Corte Actual</Badge>
                        <h3 className="text-3xl font-black mb-1">$12,450.00</h3>
                        <p className="text-indigo-100 text-sm font-medium">Disponible para liquidar a cuenta maestra</p>
                    </div>

                    <div className="relative z-10 space-y-4 pt-8 border-t border-white/10">
                        <div className="flex justify-between text-sm">
                            <span className="text-indigo-200">Próxima liquidación</span>
                            <span className="font-bold">25 Feb, 2024</span>
                        </div>
                        <Button className="w-full bg-white text-indigo-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            Liquidar Ahora <ArrowUpRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <DollarSign className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10" />
                </Card>
            </div>

            {/* Recent Payments Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                    <h3 className="font-bold text-lg text-slate-900">Pagos de Suscripciones</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-medium">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-8 py-4">Tenant</th>
                                <th className="px-8 py-4">Plan</th>
                                <th className="px-8 py-4">Monto</th>
                                <th className="px-8 py-4">Fecha</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {data.recent_payments.map((p: PaymentRow) => (
                                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <User className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <span className="font-bold text-slate-900">{p.tenant}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 uppercase font-black tracking-widest text-[11px] text-slate-500">{p.plan}</td>
                                    <td className="px-8 py-5 font-bold text-slate-900">${p.amount}</td>
                                    <td className="px-8 py-5 text-slate-500">{new Date(p.date).toLocaleString()}</td>
                                    <td className="px-8 py-5">
                                        {p.status === 'completed' ? (
                                            <Badge bg="bg-emerald-50" color="text-emerald-600">Completo</Badge>
                                        ) : p.status === 'pending' ? (
                                            <Badge bg="bg-amber-50" color="text-amber-600">Pendiente</Badge>
                                        ) : (
                                            <Badge bg="bg-rose-50" color="text-rose-600">Fallido</Badge>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
