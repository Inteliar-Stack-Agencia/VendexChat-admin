import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, ShoppingBag, Store } from 'lucide-react'
import { superadminApi } from '../../services/api'
import type { GlobalStats, TrendPoint, TopStore } from '../../types'

export default function SAStatsPage() {
    const [stats, setStats] = useState<GlobalStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        superadminApi.getGlobalStats()
            .then(setStats)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Calculando analíticas avanzadas...</div>
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Estadísticas Avanzadas</h2>
                <p className="text-slate-500 mt-1">Análisis profundo del rendimiento global y crecimiento del SaaS.</p>
            </header>

            {/* Growth Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Card */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900">Tendencia de Ingresos</h3>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{stats?.revenue_growth}</span>
                    </div>

                    <div className="h-48 flex items-end gap-2 px-2">
                        {stats?.revenue_trend.map((d: TrendPoint, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div
                                    className="w-full bg-indigo-100 rounded-lg group-hover:bg-indigo-600 transition-all cursor-pointer relative"
                                    style={{ height: `${(d.value / 15000) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        ${d.value.toLocaleString()}
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{d.date.split('-')[2]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Orders Trend Card */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900">Volumen de Órdenes</h3>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{stats?.orders_growth}</span>
                    </div>

                    <div className="h-48 flex items-end gap-2 px-2">
                        {stats?.orders_trend.map((d: TrendPoint, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div
                                    className="w-full bg-indigo-100 rounded-lg group-hover:bg-indigo-600 transition-all cursor-pointer relative"
                                    style={{ height: `${(d.value / 130) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {d.value} pedidos
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{d.date.split('-')[2]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Stores List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                    <h3 className="font-bold text-lg text-slate-900">Tiendas de Alto Rendimiento (MDR)</h3>
                </div>
                <div className="p-0">
                    {stats?.top_stores && stats.top_stores.length > 0 ? (
                        stats.top_stores.map((store: TopStore, i: number) => (
                            <div key={i} className="flex items-center justify-between px-8 py-6 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                                        <Store className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{store.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{store.orders} pedidos registrados</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-900">{store.sales}</p>
                                    <div className="flex items-center gap-1 text-emerald-600 justify-end mt-0.5">
                                        <TrendingUp className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase">{store.growth}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="p-20 text-center text-slate-400 font-bold italic">No hay suficientes datos de ventas aún.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
