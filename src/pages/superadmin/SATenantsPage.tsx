import { useState } from 'react'
import { Search, Filter, MoreHorizontal, Store, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function SATenantsPage() {
    const [searchTerm, setSearchTerm] = useState('')

    const tenants = [
        { id: '1', name: 'Morfi Viandas Retiro', slug: 'morfi-viandas-retiro', plan: 'Premium', status: 'active', created_at: '2024-02-18', country: 'AR' },
        { id: '2', name: 'Burger Palace', slug: 'burger-palace', plan: 'Free', status: 'active', created_at: '2024-02-17', country: 'CL' },
        { id: '3', name: 'Pizzeria Don Luis', slug: 'don-luis-pizzas', plan: 'Pro', status: 'suspended', created_at: '2024-02-15', country: 'UY' },
        { id: '4', name: 'Dulce Amelia', slug: 'dulce-amelia', plan: 'Premium', status: 'active', created_at: '2024-02-10', country: 'ES' },
        { id: '5', name: 'Tech Gear Shop', slug: 'tech-gear', plan: 'Pro', status: 'pending', created_at: '2024-02-05', country: 'MX' },
    ]

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle className="w-3 h-3" /> Activo</span>
            case 'suspended':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100"><XCircle className="w-3 h-3" /> Suspendido</span>
            default:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100"><Clock className="w-3 h-3" /> Pendiente</span>
        }
    }

    const getPlanBadge = (plan: string) => {
        const colors: Record<string, string> = {
            'Free': 'bg-slate-100 text-slate-600',
            'Pro': 'bg-blue-100 text-blue-700',
            'Premium': 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
        }
        return <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${colors[plan] || 'bg-gray-100'}`}>{plan}</span>
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Tiendas</h2>
                    <p className="text-slate-500 mt-1">Administra los tenants y sus planes de suscripción.</p>
                </div>
                <button className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 shrink-0">
                    + Nueva Tienda Manual
                </button>
            </header>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, slug o ID..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" /> Filtros
                    </button>
                    <select className="flex-1 md:w-40 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-600/20">
                        <option>Todos los planes</option>
                        <option>Premium</option>
                        <option>Pro</option>
                        <option>Free</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Negocio</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">País</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors">
                                                <Store className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none">{tenant.name}</p>
                                                <p className="text-xs text-slate-500 mt-1">/{tenant.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{tenant.country}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {getPlanBadge(tenant.plan)}
                                    </td>
                                    <td className="px-8 py-5">
                                        {getStatusBadge(tenant.status)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 italic">Mostrando 5 de 1,284 tiendas</p>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
