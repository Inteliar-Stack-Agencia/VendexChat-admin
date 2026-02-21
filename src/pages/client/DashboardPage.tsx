import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  DollarSign,
  Plus,
  Clock,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Zap,
  Shield,
  LayoutGrid,
  FolderOpen,
  Image as ImageIcon,
  MessageSquare,
  Clock as ClockIcon,
  CreditCard,
  TrendingUp,
  Truck,
  QrCode,
  Tags,
  PlusCircle,
  Percent,
  Bell,
  HelpCircle,
  Globe,
  Users,
  Wand2
} from 'lucide-react'
import { Card, LoadingSpinner, Badge, Button } from '../../components/common'
import { dashboardApi, tenantApi } from '../../services/api'
import { DashboardStats, Tenant } from '../../types'
import { formatPrice, formatDate, orderStatusConfig } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'

const modules = [
  { id: 'mi-tienda', label: 'Mi Tienda', icon: Globe, path: '/settings#general' },
  { id: 'ayuda', label: 'Ayuda', icon: HelpCircle, path: '/ayuda' },
  { id: 'sliders', label: 'Sliders', icon: ImageIcon, path: '/sliders' },
  { id: 'productos', label: 'Productos', icon: Package, path: '/products' },
  { id: 'categorias', label: 'Categorías', icon: FolderOpen, path: '/categories' },
  { id: 'clientes', label: 'Clientes', icon: Users, path: '/customers' },
  { id: 'horarios', label: 'Horarios', icon: ClockIcon, path: '/horarios' },
  { id: 'metodos-cobro', label: 'Métodos de Cobro', icon: CreditCard, path: '/settings#payments' },
  { id: 'envio-retiro', label: 'Envío / Retiro', icon: Truck, path: '/settings#orders' },
  { id: 'menu-qr', label: 'Menú QR', icon: QrCode, path: '/qr' },
  { id: 'cupones', label: 'Cupones', icon: Percent, path: '/coupons' },
  { id: 'mensajes', label: 'Popups', icon: Bell, path: '/popups' },
]

export default function DashboardPage() {
  const { subscription } = useAuth()
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
  const currentPlan = subscription?.plan_type || 'free'

  if (loading) return <LoadingSpinner text="Cargando dashboard..." />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Bienvenido de nuevo a tu panel de control.</p>
        </div>
        <div className="flex items-center gap-3">
          {currentPlan === 'free' && (
            <Link to="/subscription">
              <Button variant="secondary" size="sm" className="bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100">
                <Zap className="w-4 h-4 mr-2 fill-current" />
                Mejorar Plan
              </Button>
            </Link>
          )}
          <Link to="/products/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 transition-all hover:shadow-md border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pedidos de hoy</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.orders_today ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 transition-all hover:shadow-md border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas hoy</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats?.sales_today ?? 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 transition-all hover:shadow-md border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Productos activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.active_products ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Modules Grid (VENDEx Pro Style) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Acceso Rápido</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {modules.map((mod) => (
            <Link key={mod.id} to={mod.path}>
              <div
                className="group relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-emerald-100 overflow-hidden h-28 flex flex-col items-center justify-center text-center p-3 cursor-pointer rounded-2xl bg-emerald-50/50 shadow-sm"
              >
                <div className="absolute inset-0 bg-emerald-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm border border-emerald-100 transition-transform group-hover:scale-110">
                    <mod.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider leading-tight block">{mod.label}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos pedidos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Últimos Pedidos
            </h2>
            <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Ver todos
            </Link>
          </div>

          <Card padding={false} className="overflow-hidden border-gray-100 shadow-sm">
            <div className="divide-y divide-gray-100">
              {stats?.recent_orders && stats.recent_orders.length > 0 ? (
                stats.recent_orders.slice(0, 5).map((order) => {
                  const statusConf = orderStatusConfig[order.status]
                  return (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">#{order.order_number || order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{order.customer_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</p>
                        <Badge color={statusConf?.color} bg={statusConf?.bg} className="text-[10px]">
                          {statusConf?.label || order.status}
                        </Badge>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="p-12 text-center">
                  <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Sin pedidos recientes</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Alertas de stock */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${(stats?.low_stock_products?.length || 0) > 0 ? 'text-rose-500 animate-pulse' : 'text-gray-400'}`} />
              Stock Bajo
              {(stats?.low_stock_products?.length || 0) > 0 && (
                <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                  {stats?.low_stock_products?.length}
                </span>
              )}
            </h2>
            <Link to="/products" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Gestionar Stock
            </Link>
          </div>

          <Card padding={false} className={`overflow-hidden border-gray-100 shadow-sm ${(stats?.low_stock_products?.length || 0) > 5 ? 'max-h-[400px] overflow-y-auto scrollbar-hide' : ''}`}>
            <div className="divide-y divide-gray-100">
              {stats?.low_stock_products && stats.low_stock_products.length > 0 ? (
                stats.low_stock_products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/edit/${product.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{product.name}</p>
                        <p className="text-xs text-rose-500 font-medium">Quedan {product.stock} unidades</p>
                      </div>
                    </div>
                    <Badge color={product.stock === 0 ? 'text-rose-600' : 'text-amber-600'} bg={product.stock === 0 ? 'bg-rose-50' : 'bg-amber-50'} className="font-black uppercase text-[9px]">
                      {product.stock === 0 ? 'Sin Stock' : 'Bajo Stock'}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Shield className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Todo en orden. Stock al día.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
