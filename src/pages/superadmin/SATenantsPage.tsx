import { useState } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTenants } from '../../hooks/useTenants'
import SACreateTenantModal from './SACreateTenantModal'
import SADeleteTenantModal from './SADeleteTenantModal'
import TenantTableRow from './components/TenantTableRow'
import type { Tenant } from '../../types'

export default function SATenantsPage() {
    const {
        tenants,
        total,
        loading,
        saving,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        createTenant,
        deleteTenant
    } = useTenants()

    const [showModal, setShowModal] = useState(false)
    const [selectedTenantForDelete, setSelectedTenantForDelete] = useState<Tenant | null>(null)

    const handleCreateConfirm = async (data: { name: string; slug: string; email: string; country?: string; is_active?: boolean; password?: string; whatsapp?: string; plan_type?: string }) => {
        const success = await createTenant(data)
        if (success) setShowModal(false)
    }

    const handleDeleteConfirm = async () => {
        if (!selectedTenantForDelete) return
        const success = await deleteTenant(selectedTenantForDelete.id)
        if (success) setSelectedTenantForDelete(null)
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
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Negocio</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Slug</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">País</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tenants.map((tenant) => (
                                <TenantTableRow
                                    key={tenant.id}
                                    tenant={tenant}
                                    onDelete={setSelectedTenantForDelete}
                                />
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

            <SACreateTenantModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handleCreateConfirm}
                isSaving={saving}
            />

            {selectedTenantForDelete && (
                <SADeleteTenantModal
                    tenant={selectedTenantForDelete}
                    onClose={() => setSelectedTenantForDelete(null)}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </div>
    )
}
