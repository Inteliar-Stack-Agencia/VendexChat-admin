import { Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

export default function SASubscriptionsPage() {
    const subscriptions = [
        { id: 'SUB-101', tenant: 'Morfi Viandas', plan: 'Premium', status: 'active', renewal: '18 Mar, 2024', revenue: '$15,000' },
        { id: 'SUB-102', tenant: 'Burger Palace', plan: 'Free', status: 'active', renewal: 'N/A', revenue: '$0' },
        { id: 'SUB-103', tenant: 'Don Luis Pizzas', plan: 'Pro', status: 'past_due', renewal: '15 Feb, 2024', revenue: '$8,000' },
        { id: 'SUB-104', tenant: 'Dulce Amelia', plan: 'Premium', status: 'canceled', renewal: '10 Feb, 2024', revenue: '$15,000' },
    ]

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Suscripciones</h2>
                <p className="text-slate-500 mt-1">Gestiona los planes activos y renovaciones del SaaS.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Churn Rate</h4>
                    <p className="text-3xl font-bold text-slate-900">2.4%</p>
                    <p className="text-xs text-emerald-600 font-bold mt-1 shadow-sm">-0.5% vs mes anterior</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Renovaciones (30d)</h4>
                    <p className="text-3xl font-bold text-slate-900">142</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">Proyectado: $2.1M</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm bg-rose-50/30">
                    <h4 className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">Pagos Vencidos</h4>
                    <p className="text-3xl font-bold text-rose-600">8</p>
                    <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Requiere acción manual</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Negocio</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Renovación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {subscriptions.map((sub) => (
                                <tr key={sub.id}>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-400">{sub.id}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-900">{sub.tenant}</td>
                                    <td className="px-8 py-5 text-sm font-medium text-slate-600">{sub.plan}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                                sub.status === 'past_due' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            {sub.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-500">{sub.renewal}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
