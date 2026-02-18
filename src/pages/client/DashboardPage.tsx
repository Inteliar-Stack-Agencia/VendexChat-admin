import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, DollarSign, Plus, Clock, AlertTriangle, ChevronRight, ClipboardList, ExternalLink } from 'lucide-react'
import { Card, LoadingSpinner, Badge, Button } from '../../components/common'
import { dashboardApi, tenantApi } from '../../services/api'
import { DashboardStats, Tenant } from '../../types'
import { formatPrice, formatDate, orderStatusConfig } from '../../utils/helpers'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      tenantApi.getMe()
    ])
      .then(([statsData, tenantData]) => {
        setStats(statsData)
        setTenant(tenantData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const storefrontUrl = `${import.meta.env.VITE_STOREFRONT_URL}/${tenant?.slug}`

  if (loading) return <LoadingSpinner text="Cargando dashboard..." />

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Resumen de tu tienda hoy</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="bg-white">
              <ExternalLink className="w-5 h-5 text-slate-400" />
              Ver tienda
            </Button>
          </a>
          <Link to="/products/new">
            <Button variant="primary" className="shadow-lg shadow-green-200">
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                <ShoppingCart className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Pedidos hoy</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">{stats?.orders_today ?? 0}</p>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {stats?.orders_today === 0 ? 'Aún no has recibido pedidos' : 'Pedidos registrados hoy'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden group hover:border-emerald-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Ventas hoy</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">{formatPrice(stats?.sales_today ?? 0)}</p>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {stats?.sales_today === 0 ? 'Aún no hay ventas registradas' : 'Ingresos acumulados hoy'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden group hover:border-purple-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                <Package className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Productos activos</p>
                <p className="text-4xl font-bold text-slate-900 mt-1">{stats?.active_products ?? 0}</p>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {stats?.active_products === 0 ? 'Aún no tienes productos' : 'Productos disponibles en catálogo'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Últimos pedidos */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Últimos pedidos
            </h2>
            <Link to="/orders" className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <Card padding={false} className="overflow-hidden border-slate-200/60">
            <div className="divide-y divide-slate-100">
              {stats?.recent_orders && stats.recent_orders.length > 0 ? (
                stats.recent_orders.slice(0, 5).map((order) => {
                  const statusConf = orderStatusConfig[order.status]
                  return (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                          <ShoppingCart className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-green-600 transition-colors line-clamp-1">{order.customer_name}</p>
                          <p className="text-xs text-slate-400 font-medium">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-bold text-slate-900">{formatPrice(order.total)}</p>
                        <Badge color={statusConf?.color} bg={statusConf?.bg} className="text-[10px] uppercase tracking-wider">
                          {statusConf?.label || order.status}
                        </Badge>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold">Sin pedidos aún</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-[200px]">Los nuevos pedidos se mostrarán aquí.</p>
                  <Link to="/products" className="mt-6">
                    <Button variant="primary" size="sm">Ver productos</Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Alertas de stock */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Alertas de inventario
          </h2>
          <Card padding={false} className="border-slate-200/60 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {stats?.low_stock_products && stats.low_stock_products.length > 0 ? (
                stats.low_stock_products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/edit/${product.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-green-600 transition-colors line-clamp-1">{product.name}</p>
                        <p className="text-xs text-slate-400 font-medium">Stock disponible: {product.stock}</p>
                      </div>
                    </div>
                    <Badge color="text-orange-700" bg="bg-orange-50" className="text-[10px] uppercase font-bold">
                      {product.stock === 0 ? 'Sin stock' : 'Stock bajo'}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-orange-50/50 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-orange-200" />
                  </div>
                  <h3 className="text-slate-900 font-bold">Sin alertas de stock</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-[200px]">Aquí aparecerán las alertas de stock bajo.</p>
                  <Link to="/products" className="mt-6">
                    <Button variant="primary" size="sm">Ver productos</Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
