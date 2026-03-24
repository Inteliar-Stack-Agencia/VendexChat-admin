import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  DollarSign,
  Plus,
  Clock,
  AlertTriangle,
  ClipboardList,
  Zap,
  Image as ImageIcon,
  Clock as ClockIcon,
  CreditCard,
  Truck,
  QrCode,
  Percent,
  Bell,
  HelpCircle,
  Globe,
  Calendar,
  Sparkles,
  Shield,
} from 'lucide-react'
import { Card, Badge, Button } from '../../components/common'
import OnboardingChecklist from '../../components/dashboard/OnboardingChecklist'
import { dashboardApi, tenantApi } from '../../services/api'
import { DashboardStats, Tenant } from '../../types'
import { formatPrice, orderStatusConfig } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import FeatureGuard from '../../components/FeatureGuard'

function generatePromptTemplate(tenant: Tenant): string {
  const lines: string[] = []
  lines.push(`Sos el asistente de ventas de "${tenant.name}"${tenant.city ? `, una tienda de ${tenant.city}` : ''}.`)
  if (tenant.description) lines.push(`\nDescripción de la tienda: ${tenant.description}`)
  if (tenant.address) lines.push(`Dirección: ${tenant.address}`)
  if (tenant.whatsapp) lines.push(`WhatsApp de contacto: ${tenant.whatsapp}`)
  if (tenant.email) lines.push(`Email: ${tenant.email}`)
  lines.push(`\nPedidos:`)
  lines.push(`- Pedido mínimo: $${tenant.min_order || 0}`)
  lines.push(`- Costo de envío: $${tenant.delivery_cost || 0}`)
  if (tenant.delivery_info) lines.push(`- Info de envío: ${tenant.delivery_info}`)
  lines.push(`- Aceptamos pedidos online: ${tenant.accept_orders ? 'Sí' : 'No'}`)
  if (tenant.welcome_message) lines.push(`\nMensaje de bienvenida: ${tenant.welcome_message}`)
  lines.push(`\nTu rol:`)
  lines.push(`- Ayudá a los clientes a encontrar productos y responder dudas sobre precios, stock y envíos.`)
  lines.push(`- Sé amigable, claro y conciso.`)
  lines.push(`- Si no sabés algo, decí que un vendedor los va a contactar pronto.`)
  lines.push(`- Respondé siempre en español.`)
  return lines.join('\n')
}

const modules = [
  { id: 'mi-tienda', label: 'Mi Tienda', icon: Globe, path: '/settings#general' },
  { id: 'ayuda', label: 'Ayuda', icon: HelpCircle, path: '/ayuda' },
  { id: 'sliders', label: 'Sliders', icon: ImageIcon, path: '/sliders' },

  { id: 'horarios', label: 'Horarios', icon: ClockIcon, path: '/horarios' },
  { id: 'metodos-cobro', label: 'Métodos de Cobro', icon: CreditCard, path: '/settings#payments' },
  { id: 'envio-retiro', label: 'Envío / Retiro', icon: Truck, path: '/settings#orders' },
  { id: 'menu-qr', label: 'Menú QR', icon: QrCode, path: '/qr' },
  { id: 'cupones', label: 'Cupones', icon: Percent, path: '/coupons' },
  { id: 'mensajes', label: 'Popups', icon: Bell, path: '/popups' },
  { id: 'editor-precios', label: 'Editor Precios', icon: DollarSign, path: '/bulk-prices' },
]

export default function DashboardPage() {
  const { subscription, selectedStoreId, isSuperadmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  // Asistente de ventas
  const [aiPrompt, setAiPrompt] = useState('')

  // Plan efectivo: para superadmins usar el plan del tenant (metadata), sino el de la suscripción
  const currentPlan = (isSuperadmin
    ? (tenant?.metadata?.plan_type as string | undefined)
    : subscription?.plan_type) || 'free'

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([
      dashboardApi.getStats(),
      tenantApi.getMe()
    ])
      .then(([statsData, tenantData]) => {
        setStats(statsData)
        setTenant(tenantData)
        const saved = (tenantData.metadata?.ai_prompt as string | undefined) || tenantData.ai_prompt || ''
        const prompt: string = saved || generatePromptTemplate(tenantData)
        setAiPrompt(prompt)
      })
      .catch((err) => {
        console.error('[DashboardPage] Error cargando datos:', err)
        // Si falla, mostramos el dashboard vacío (no infinite skeleton)
      })
      .finally(() => setLoading(false))
  }, [selectedStoreId])

  const isTrial = subscription?.status === 'trial'

  // Calcular días restantes de prueba
  const trialDaysLeft = subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-gray-200 rounded-lg" />
          <div className="h-4 w-56 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-gray-200 rounded-lg" />
      </div>
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 border border-gray-100 rounded-xl shadow-sm bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg" />
              <div className="space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-7 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Quick access skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      {/* Orders + Stock skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-white">
            <div className="h-8 bg-gray-50 border-b border-gray-100 mx-4 my-3 rounded" />
            {[1, 2, 3].map(j => (
              <div key={j} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Trial Countdown Banner */}
      {isTrial && (
        <div className={`p-4 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 border transition-all duration-500 ${trialDaysLeft > 0
          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500/20'
          : 'bg-gradient-to-r from-rose-600 to-rose-700 text-white border-rose-500/20 animate-pulse'
          }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl backdrop-blur-sm ${trialDaysLeft > 0 ? 'bg-white/10' : 'bg-white/20'}`}>
              {trialDaysLeft > 0 ? (
                <Calendar className="w-6 h-6 text-emerald-100" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-100" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {trialDaysLeft > 0 ? 'Período de Prueba PRO Activo' : 'Prueba PRO Finalizada'}
              </h3>
              <p className={`${trialDaysLeft > 0 ? 'text-emerald-50/80' : 'text-rose-50/80'} text-sm`}>
                {trialDaysLeft > 0 ? (
                  <>Te quedan <span className="font-bold text-white uppercase">{trialDaysLeft} días</span> para disfrutar de todas las funciones premium.</>
                ) : (
                  <>Tu tiempo de prueba ha terminado. Activa tu plan para seguir usando las herramientas PRO.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/subscription">
              <Button
                variant="secondary"
                size="sm"
                className={`border-none font-bold uppercase tracking-widest text-[10px] px-6 py-2.5 shadow-lg ${trialDaysLeft > 0
                  ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                  : 'bg-white text-rose-700 hover:bg-rose-50'
                  }`}
              >
                {trialDaysLeft > 0 ? 'Activar Suscripción' : 'Ver Planes y Precios'}
              </Button>
            </Link>
          </div>
        </div>
      )}
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

      <OnboardingChecklist tenant={tenant} stats={stats} />

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

      {/* Asistente de Ventas IA */}
      <FeatureGuard feature="ai-analyst" minPlan="pro" fallback="hide">
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Asistente de Ventas IA
          </h2>
        </div>

        <Card className="p-5">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Instrucciones actuales del asistente
            </p>
            <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-48 overflow-y-auto">
              {aiPrompt || 'Sin configurar aún.'}
            </pre>
          </div>
        </Card>
      </div>
      </FeatureGuard>

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
