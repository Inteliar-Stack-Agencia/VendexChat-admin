import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">SaaS Overview</h2>
                <p className="text-slate-500 mt-1">Monitorea el estado global de VendexChat.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4" />
                            <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
                            <div className="h-8 bg-slate-100 rounded w-3/4" />
                        </div>
                    ))
                ) : (
                    stats.map((stat) => (
                        <div key={stat.name} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group cursor-default">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stat.trend}
                                </span>
                            </div>
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{stat.name}</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-lg text-slate-900">Actividad Reciente</h3>
                        <Link to="/sa/tenants" className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Ver todas</Link>
                    </div>
                    <div className="p-8 space-y-6">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                                    </div>
                                </div>
                            ))
                        ) : data?.recent_activity && data.recent_activity.length > 0 ? (
                            data.recent_activity.map((activity: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                        <Store className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                            Nueva tienda: <span className="text-indigo-600">{activity.name}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                                            {activity.is_active ? '✅ Activa' : '⏳ Pendiente'} • {new Date(activity.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-[10px] text-indigo-500 font-black uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">Nuevo</div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-400 py-20 font-bold uppercase tracking-widest text-[10px]">Sin actividad reciente</p>
                        )}
                    </div>
                </div>

                {/* Action Center - Real Alerts */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2rem] p-10 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group flex flex-col justify-between min-h-[400px]">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-black mb-3">Centro de Alertas</h3>
                        <p className="text-indigo-100/80 text-sm mb-8 leading-relaxed font-medium">
                            Tienes <span className="text-white font-bold">{data?.pending_actions || 0}</span> tiendas con trial por vencer próximamente que requieren seguimiento comercial.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-3">
                        <Link
                            to="/sa/subscriptions"
                            className="w-full bg-white text-indigo-600 font-black text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-slate-50 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
                        >
                            Gestionar Suscripciones
                        </Link>
                        <p className="text-[9px] text-indigo-300 text-center font-bold uppercase tracking-tighter">
                            VENDEx Auto-Pilot: Activado
                        </p>
                    </div>

                    <AlertCircle className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700" />
                </div>
            </div>
        </div>
    )
}
