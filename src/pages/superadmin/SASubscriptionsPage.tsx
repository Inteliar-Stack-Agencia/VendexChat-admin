import { useState, useEffect } from 'react'
import { Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { superadminApi } from '../../services/api'
import { LoadingSpinner } from '../../components/common'

export default function SASubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        superadminApi.listSubscriptions()
            .then(setSubscriptions)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <LoadingSpinner text="Cargando suscripciones globales..." />

    const stats = {
        active: subscriptions.filter(s => s.status === 'active').length,
        past_due: subscriptions.filter(s => s.status === 'past_due' || s.status === 'incomplete').length,
        revenue: subscriptions.filter(s => s.status === 'active').reduce((acc, s) => {
            const price = s.plan_type === 'premium' ? 35 : s.plan_type === 'pro' ? 15 : s.plan_type === 'vip' ? 25 : 0
            return acc + price
        }, 0)
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Suscripciones</h2>
                <p className="text-slate-500 mt-1">Gestiona los planes activos y renovaciones del SaaS.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Planes Activos</h4>
                    <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
                    <p className="text-xs text-emerald-600 font-bold mt-1 shadow-sm">Pro y Premium</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">MRR Renovaciones</h4>
                    <p className="text-3xl font-bold text-slate-900">${stats.revenue}</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">Proyectado mensual</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm bg-rose-50/30">
                    <h4 className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">Pagos Vencidos</h4>
                    <p className="text-3xl font-bold text-rose-600">{stats.past_due}</p>
                    <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Requiere revisión</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Negocio</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Últ. Pago</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Próxima Ren.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {subscriptions.map((sub) => (
                                <tr key={sub.id}>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-900">{sub.store_name}</td>
                                    <td className="px-8 py-5 text-sm font-black uppercase tracking-widest text-slate-500">{sub.plan_type}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                            sub.status === 'past_due' || sub.status === 'incomplete' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            {sub.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-400">{new Date(sub.updated_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-500">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
