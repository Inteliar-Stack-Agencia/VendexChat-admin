import { useState, useEffect } from 'react'
import { Users, Search, MessageSquare, ClipboardList } from 'lucide-react'
import { Card, LoadingSpinner, EmptyState, Modal, Button, showToast } from '../../components/common'
import { customersApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function CustomersPage() {
    const { selectedStoreId } = useAuth()
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
    const [isEditingNotes, setIsEditingNotes] = useState(false)
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadCustomers()
    }, [selectedStoreId])

    const loadCustomers = () => {
        setLoading(true)
        customersApi.list()
            .then(setCustomers)
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    const handleUpdateNotes = async () => {
        if (!selectedCustomer) return
        setSaving(true)
        try {
            await customersApi.updateNotes(selectedCustomer.id, notes)
            showToast('success', 'Notas actualizadas')
            setIsEditingNotes(false)
            loadCustomers()
        } catch (err) {
            showToast('error', 'No se pudieron guardar las notas')
        } finally {
            setSaving(false)
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.whatsapp.includes(search)
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Clientes (CRM)</h1>
            </div>

            <Card>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o WhatsApp..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </Card>

            {loading ? (
                <LoadingSpinner text="Cargando clientes..." />
            ) : filteredCustomers.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-16 h-16" />}
                    title="No hay clientes"
                    description="Los clientes aparecerán aquí cuando realicen su primer pedido."
                />
            ) : (
                <Card padding={false}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 uppercase text-[10px] font-black tracking-widest text-gray-400">
                                    <th className="text-left px-6 py-4">Cliente</th>
                                    <th className="text-left px-6 py-4">WhatsApp</th>
                                    <th className="text-center px-6 py-4">Pedidos</th>
                                    <th className="text-right px-6 py-4">Total Invertido</th>
                                    <th className="text-right px-6 py-4 text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{customer.name}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">Último: {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600 font-medium">{customer.whatsapp}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs">{customer.total_orders}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-gray-900 font-bold">${customer.total_spent}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomer(customer)
                                                        setNotes(customer.notes || '')
                                                        setIsEditingNotes(true)
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                                                    title="Notas del cliente"
                                                >
                                                    <ClipboardList className="w-4 h-4" />
                                                </button>
                                                <a
                                                    href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-emerald-600 transition-all border border-transparent hover:border-emerald-100"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal de Notas */}
            <Modal
                isOpen={isEditingNotes}
                onClose={() => setIsEditingNotes(false)}
                title={`Notas: ${selectedCustomer?.name}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                            Anotaciones internas
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Cliente recurrente, prefiere envíos por la mañana..."
                            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsEditingNotes(false)}>Cancelar</Button>
                        <Button
                            variant="primary"
                            onClick={handleUpdateNotes}
                            loading={saving}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Guardar Notas
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
