import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowUpRight,
} from 'lucide-react'
import { superadminApi } from '../../services/api'

export default function SAPaymentsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        superadminApi.listGlobalOrders()
            .then(res => setOrders(res.data))
            .finally(() => setLoading(false))
    }, [])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">Completado</span>
            case 'cancelled':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">Cancelado</span>
            default:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">{status}</span>
        }
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pagos Recibidos (Órdenes)</h2>
                <p className="text-slate-500 mt-1">Monitorea el flujo financiero global de todas las tiendas.</p>
            </header>

            {/* Table Section */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nº Orden</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tenant</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {orders.map((o) => (
                                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5 text-sm font-bold text-slate-900">#{o.order_number}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-700">{o.store_name}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(o.created_at).toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-black text-slate-900">${o.total.toLocaleString()}</td>
                                    <td className="px-8 py-5">
                                        {getStatusBadge(o.status)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link to={`/sa/tenants/${o.store_id}`} className="p-2 inline-block rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && orders.length === 0 && (
                    <div className="p-20 text-center text-slate-400 font-bold italic">No hay órdenes registradas aún.</div>
                )}
            </div>
        </div>
    )
}
