import { useState, useEffect } from 'react'
import { Store, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { superadminApi } from '../../services/api'

export default function SAOverviewPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        superadminApi.overview()
            .then(setData)
            .finally(() => setLoading(false))
    }, [])

    const stats = [
        { name: 'Tiendas Activas', value: data?.active_stores || '0', icon: Store, trend: '+12%', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { name: 'Nuevas (7d)', value: data?.new_stores_7d || '0', icon: TrendingUp, trend: '+8%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { name: 'MRR Estimado', value: `$${(data?.mrr_estimated || 0).toLocaleString()}`, icon: DollarSign, trend: '+5%', color: 'text-violet-600', bg: 'bg-violet-50' },
        { name: 'Pagos Fallidos', value: data?.failed_payments || '0', icon: AlertCircle, trend: '-20%', color: 'text-rose-600', bg: 'bg-rose-50' },
    ]

    if (loading) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Cargando métricas globales...</div>
    }

    return (
        <div className="space-y-10">
            <header>
                <h2 className="text-3xl font-bold text-slate-900">SaaS Overview</h2>
                <p className="text-slate-500 mt-1">Monitorea el estado global de VendexChat.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Placeholder */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-lg text-slate-900">Actividad Reciente</h3>
                        <button className="text-indigo-600 text-sm font-bold hover:underline">Ver todo</button>
                    </div>
                    <div className="p-8 space-y-6">
                        {data?.recent_activity && data.recent_activity.length > 0 ? (
                            data.recent_activity.map((activity: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                        <Store className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                            Nueva tienda: <span className="text-indigo-600">{activity.name}</span>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {activity.is_active ? '✅ Activa' : '⏳ Pendiente'} • {new Date(activity.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium">✨ Reciente</div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-400 py-10 font-bold uppercase tracking-widest text-xs">Sin actividad reciente</p>
                        )}
                    </div>
                </div>

                {/* Action Center Placeholder */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">Centro de Alertas</h3>
                        <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Tienes 3 pagos fallidos pendientes de revisión manual.</p>
                        <button className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-lg">
                            Ver Reporte de Pagos
                        </button>
                    </div>
                    <AlertCircle className="absolute -bottom-6 -right-6 w-32 h-32 text-indigo-500/20 group-hover:scale-110 transition-transform" />
                </div>
            </div>
        </div>
    )
}
