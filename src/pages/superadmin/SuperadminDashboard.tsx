import { useState, useEffect } from 'react'
import { Store, ShoppingCart, DollarSign, UserPlus, ExternalLink } from 'lucide-react'
import { Card, Badge, LoadingSpinner } from '../../components/common'
import { superadminApi } from '../../services/api'
import { SuperadminDashboard as DashboardType } from '../../types'
import { formatPrice, formatShortDate } from '../../utils/helpers'

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'https://vendexchat.app'

export default function SuperadminDashboard() {
  const [data, setData] = useState<DashboardType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superadminApi
      .dashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Cargando dashboard..." />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard - Superadmin</h1>

      {/* Métricas globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tiendas activas</p>
              <p className="text-2xl font-bold text-gray-900">{data?.total_stores ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{data?.total_orders ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos del mes</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(data?.total_revenue ?? 0)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Registros esta semana</p>
              <p className="text-2xl font-bold text-gray-900">{data?.new_registrations_week ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabla de tiendas */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Todas las tiendas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Creada</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.stores?.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{tenant.slug}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatShortDate(tenant.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      color={tenant.is_active ? 'text-green-800' : 'text-red-800'}
                      bg={tenant.is_active ? 'bg-green-100' : 'bg-red-100'}
                    >
                      {tenant.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <a
                        href={`${STOREFRONT_URL}/${tenant.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
