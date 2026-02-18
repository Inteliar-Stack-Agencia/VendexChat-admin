import { useState, useEffect } from 'react'
import {
  ShoppingCart, Package, FolderOpen,
  Store, Clock, HelpCircle,
  DollarSign, Settings, Bell,
  QrCode, CreditCard, Star,
  Percent, Image, History,
  LayoutGrid
} from 'lucide-react'
import { Card, LoadingSpinner, Badge, ModuleCard } from '../../components/common'
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

  if (loading) return <LoadingSpinner text="Cargando panel de control..." />

  const modules = [
    { title: 'Ayuda', icon: HelpCircle, href: '#', color: 'bg-green-500' },
    { title: 'Mi Tienda', icon: Store, href: '/settings', color: 'bg-blue-500' },
    { title: 'Categorías', icon: FolderOpen, href: '/categories', color: 'bg-blue-600' },
    { title: 'Sliders', icon: Image, href: '#', color: 'bg-blue-500' },
    { title: 'Cambiar Precios', icon: DollarSign, href: '/products', color: 'bg-blue-600' },
    { title: 'Información', icon: Settings, href: '/settings', color: 'bg-blue-500' },
    { title: 'Horarios', icon: Clock, href: '#', color: 'bg-blue-600' },
    { title: 'Métodos de Cobro', icon: CreditCard, href: '#', color: 'bg-blue-500' },
    { title: 'Estadísticas', icon: DollarSign, href: '#', color: 'bg-blue-600' },
    { title: 'Envío / Retiro', icon: ShoppingCart, href: '#', color: 'bg-blue-500' },
    { title: 'Menú QR', icon: QrCode, href: '#', color: 'bg-blue-600' },
    { title: 'Campos Personalizados', icon: Bell, href: '#', color: 'bg-blue-500' },
    { title: 'Adicionales', icon: PlusIcon, href: '#', color: 'bg-blue-600' },
    { title: 'Opcionales', icon: Star, href: '#', color: 'bg-blue-500' },
    { title: 'Mercado Pago', icon: CreditCard, href: '#', color: 'bg-blue-600' },
    { title: 'Mensajes Emergentes', icon: Bell, href: '#', color: 'bg-blue-500' },
    { title: 'Cupones de Descuento', icon: Percent, href: '#', color: 'bg-blue-600' },
    { title: 'Destacados', icon: Star, href: '#', color: 'bg-blue-500' },
    { title: 'Variantes', icon: LayoutGrid, href: '#', color: 'bg-blue-600' },
    { title: 'Control Stock', icon: Package, href: '/products', color: 'bg-blue-500' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Modulos</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Store className="w-4 h-4" />
          <span>{tenant?.name}</span>
        </div>
      </div>

      {/* Grid de Modulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
          />
        ))}
      </div>

      {/* Información de Perfil / Estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 italic">
        <div>
          <h4 className="text-gray-500 mb-1">Perfil:</h4>
          <p className="text-gray-900 not-italic font-medium">{tenant?.name}</p>
        </div>
        <div>
          <h4 className="text-gray-500 mb-1">Estado de Mi Tienda:</h4>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <p className="text-xs text-center mt-1 text-green-600 font-bold">100%</p>
        </div>
        <div>
          <h4 className="text-gray-500 mb-1">Notificaciones:</h4>
          <p className="text-gray-400">Sin notificaciones pendientes</p>
        </div>
      </div>
    </div>
  )
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
