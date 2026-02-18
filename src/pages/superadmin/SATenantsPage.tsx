import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, MoreHorizontal, Store, CheckCircle, Clock, ChevronLeft, ChevronRight, X, RefreshCw, Send } from 'lucide-react'
import { superadminApi } from '../../services/api'
import { Tenant } from '../../types'

export default function SATenantsPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [newTenant, setNewTenant] = useState({ name: '', slug: '', email: '' })

    const loadTenants = () => {
        setLoading(true)
        superadminApi.listTenants({ q: searchTerm, status: statusFilter })
            .then(res => {
                setTenants(res.data)
                setTotal(res.total)
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadTenants()
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [searchTerm, statusFilter])

    const handleCreate = async () => {
        if (!newTenant.name || !newTenant.slug) return
        setSaving(true)
        try {
            await superadminApi.createTenant({
                name: newTenant.name,
                slug: newTenant.slug.toLowerCase().replace(/\s+/g, '-'),
                email: newTenant.email,
                is_active: true
            })
            setShowModal(false)
            setNewTenant({ name: '', slug: '', email: '' })
            loadTenants()
        } catch (err) {
            console.error('Error creating tenant:', err)
            alert('Error al crear la tienda. El slug podría estar duplicado.')
        } finally {
            setSaving(false)
        }
    }

    const getStatusBadge = (tenant: Tenant) => {
        if (tenant.is_active) {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle className="w-3 h-3" /> Activo</span>
        }
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100"><Clock className="w-3 h-3" /> Inactivo</span>
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Tiendas</h2>
                    <p className="text-slate-500 mt-1">Administra los tenants y sus planes de suscripción.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 shrink-0"
                >
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
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" /> Filtros
                    </button>
                    <select
                        className="flex-1 md:w-40 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-600/20"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Negocio</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Slug</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                                                <Store className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-none">{tenant.name}</p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">{new Date(tenant.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-400 italic">/{tenant.slug}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {getStatusBadge(tenant)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link
                                            to={`/sa/tenants/${tenant.id}`}
                                            className="inline-block p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 italic">Mostrando {tenants.length} de {total} tiendas</p>
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

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col scale-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Nueva Tienda Manual</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Negocio</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="Ej: Tienda de Pepe"
                                    value={newTenant.name}
                                    onChange={(e) => setNewTenant(t => ({ ...t, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Slug (URL)</label>
                                <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-4 py-3">
                                    <span className="text-slate-400 font-bold">/</span>
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0 outline-none"
                                        placeholder="tienda-de-pepe"
                                        value={newTenant.slug}
                                        onChange={(e) => setNewTenant(t => ({ ...t, slug: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email del Propietario (Opcional)</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="pepe@email.com"
                                    value={newTenant.email}
                                    onChange={(e) => setNewTenant(t => ({ ...t, email: e.target.value }))}
                                />
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={saving || !newTenant.name || !newTenant.slug}
                                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                Dar de Alta Tienda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
