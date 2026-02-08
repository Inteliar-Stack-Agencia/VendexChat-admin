import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, DollarSign, Plus, Clock, AlertTriangle } from 'lucide-react'
import { Card, LoadingSpinner, Badge } from '../../components/common'
import { dashboardApi } from '../../services/api'
import { DashboardStats } from '../../types'
import { formatPrice, formatDate, orderStatusConfig } from '../../utils/helpers'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Cargando dashboard..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar producto
        </Link>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pedidos hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.orders_today ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ventas hoy</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats?.sales_today ?? 0)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Productos activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.active_products ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos pedidos */}
        <Card padding={false}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Últimos pedidos
            </h2>
            <Link to="/orders" className="text-sm text-emerald-600 hover:text-emerald-700">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recent_orders && stats.recent_orders.length > 0 ? (
              stats.recent_orders.slice(0, 5).map((order) => {
                const statusConf = orderStatusConfig[order.status]
                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p>
                      <Badge color={statusConf?.color} bg={statusConf?.bg}>
                        {statusConf?.label || order.status}
                      </Badge>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No hay pedidos recientes
              </div>
            )}
          </div>
        </Card>

        {/* Productos sin stock */}
        <Card padding={false}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Productos sin stock / inactivos
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.low_stock_products && stats.low_stock_products.length > 0 ? (
              stats.low_stock_products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/edit/${product.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                    </div>
                  </div>
                  <Badge color="text-yellow-800" bg="bg-yellow-100">
                    {product.is_active ? 'Sin stock' : 'Inactivo'}
                  </Badge>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Todos tus productos están en orden
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
