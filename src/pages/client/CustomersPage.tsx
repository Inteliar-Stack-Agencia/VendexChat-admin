import { useState, useEffect } from 'react'
import { Users, Search, MessageSquare } from 'lucide-react'
import { Card, LoadingSpinner, EmptyState } from '../../components/common'
import { customersApi } from '../../services/api'

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        customersApi.list()
            .then(setCustomers)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.whatsapp.includes(search)
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
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
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">WhatsApp</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Dirección</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.map((customer, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900">{customer.name}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{customer.whatsapp}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{customer.address || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <a
                                                href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                <span className="hidden sm:inline">WhatsApp</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
