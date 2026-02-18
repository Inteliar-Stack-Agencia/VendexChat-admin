import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    CreditCard,
    Search,
    Filter,
    ArrowUpRight,
    CheckCircle,
    XCircle,
    Clock,
    ExternalLink
} from 'lucide-react'

export default function SAPaymentsPage() {
    const [searchTerm, setSearchTerm] = useState('')

    const payments = [
        { id: 'PAY-821', tenant: 'Morfi Viandas', amount: '$4,500', provider: 'MercadoPago', status: 'completed', date: 'Hoy, 09:12 AM' },
        { id: 'PAY-820', tenant: 'Burger Palace', amount: '$1,200', provider: 'PayPal', status: 'completed', date: 'Ayer, 11:30 PM' },
        { id: 'PAY-819', tenant: 'Don Luis Pizzas', amount: '$2,800', provider: 'MercadoPago', status: 'failed', date: 'Ayer, 04:15 PM' },
        { id: 'PAY-818', tenant: 'Dulce Amelia', amount: '$950', provider: 'Stripe', status: 'pending', date: '21 Feb, 2024' },
        { id: 'PAY-817', tenant: 'Tech Gear Shop', amount: '$12,000', provider: 'MercadoPago', status: 'completed', date: '20 Feb, 2024' },
    ]

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">Completado</span>
            case 'failed':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">Fallido</span>
            default:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">Pendiente</span>
        }
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Historial de Pagos</h2>
                <p className="text-slate-500 mt-1">Monitorea todas las transacciones procesadas en la plataforma.</p>
            </header>

            {/* Summary Mini Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exitosos (24h)</p>
                        <h4 className="text-xl font-bold text-slate-900">$28,450</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fallidos (24h)</p>
                        <h4 className="text-xl font-bold text-slate-900">4</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4 text-white bg-slate-900 border-none shadow-xl shadow-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">En Revisión</p>
                        <h4 className="text-xl font-bold">12</h4>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por ID o Tenant..."
                            className="w-full pl-10 pr-4 py-2 border-none bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter className="w-3.5 h-3.5" /> Filtrar
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID Pago</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tenant</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Método</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {payments.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5 text-sm font-bold text-slate-900">{p.id}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-700">{p.tenant}</span>
                                            <Link to="/sa/tenants" className="opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-all">
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{p.date}</p>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-black text-slate-900">{p.amount}</td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{p.provider}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {getStatusBadge(p.status)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
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
