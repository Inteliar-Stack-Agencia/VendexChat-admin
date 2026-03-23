import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  LogOut,
  X,
  Store,
  Users,
  Shield,
  DollarSign,
  Bot,
  Truck,
  Wand2,
  BarChart3,
  Brain,
  Cpu,
  Crown,
  Receipt,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, isSuperadmin } = useAuth()
  const navigate = useNavigate()
  const isImpersonating = !!localStorage.getItem('vendexchat_impersonated_store')

  const linkClass = ({ isActive }: { isActive: boolean }) => {
    // Si estamos suplantando, usamos los colores de esmeralda (merchant)
    const activeColors = (isSuperadmin && !isImpersonating)
      ? 'bg-indigo-50 text-indigo-700'
      : 'bg-emerald-50 text-emerald-700'

    return `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
      ? activeColors
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="VENDExChat" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-gray-900">VENDExChat</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {(isSuperadmin && !isImpersonating) ? (
            <>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Superadmin
              </p>
              <NavLink to="/superadmin/dashboard" className={linkClass} onClick={onClose}>
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </NavLink>
              <NavLink to="/superadmin/tenants" className={linkClass} onClick={onClose}>
                <Store className="w-5 h-5" />
                Tiendas
              </NavLink>
              <NavLink to="/superadmin/liquidations" className={linkClass} onClick={onClose}>
                <DollarSign className="w-5 h-5" />
                Liquidaciones
              </NavLink>
              <NavLink to="/superadmin/users" className={linkClass} onClick={onClose}>
                <Users className="w-5 h-5" />
                Usuarios
              </NavLink>
            </>
          ) : (
            <>
              <div className="pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operación</p>
                <NavLink to="/dashboard" className={linkClass} onClick={onClose}>
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </NavLink>
                <NavLink to="/pos" className={linkClass} onClick={onClose}>
                  <Receipt className="w-5 h-5" />
                  POS
                  <span className="ml-auto text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-black uppercase">Nuevo</span>
                </NavLink>
                <NavLink to="/orders" className={linkClass} onClick={onClose}>
                  <ShoppingCart className="w-5 h-5" />
                  Pedidos
                </NavLink>
                <NavLink to="/products" className={linkClass} onClick={onClose}>
                  <Package className="w-5 h-5" />
                  Productos
                </NavLink>
                <NavLink to="/categories" className={linkClass} onClick={onClose}>
                  <FolderOpen className="w-5 h-5" />
                  Categorías
                </NavLink>
                <NavLink to="/customers" className={linkClass} onClick={onClose}>
                  <Users className="w-5 h-5" />
                  Clientes
                  <span className="ml-auto text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                </NavLink>
                <NavLink to="/stats" className={linkClass} onClick={onClose}>
                  <BarChart3 className="w-5 h-5" />
                  Estadísticas
                  <span className="ml-auto text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                </NavLink>
                <NavLink to="/ai-importer" className={linkClass} onClick={onClose}>
                  <Wand2 className="w-5 h-5" />
                  Importador IA
                  <span className="ml-auto text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase">PRO</span>
                </NavLink>
              </div>

              <div className="pt-2 pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Módulos VIP</p>
                <NavLink to="/crm-ia" className={linkClass} onClick={onClose}>
                  <Brain className="w-5 h-5" />
                  CRM IA
                  <span className="ml-auto text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase">VIP</span>
                </NavLink>
                <NavLink to="/logistics" className={linkClass} onClick={onClose}>
                  <Truck className="w-5 h-5" />
                  Logística
                  <span className="ml-auto text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase">VIP</span>
                </NavLink>
                <NavLink to="/bot" className={linkClass} onClick={onClose}>
                  <Bot className="w-5 h-5" />
                  Asistente Tienda
                  <span className="ml-auto text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase">VIP</span>
                </NavLink>
              </div>

              <div className="pt-2 pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Módulos ULTRA
                </p>
                <NavLink to="/ai-intelligence" className={linkClass} onClick={onClose}>
                  <Cpu className="w-5 h-5" />
                  Inteligencia IA
                  <span className="ml-auto text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">ULTRA</span>
                </NavLink>
                <NavLink to="/stats-ia" className={linkClass} onClick={onClose}>
                  <BarChart3 className="w-5 h-5" />
                  Estadísticas IA
                  <span className="ml-auto text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">ULTRA</span>
                </NavLink>
                <NavLink to="/whatsapp-bot" className={linkClass} onClick={onClose}>
                  <Bot className="w-5 h-5" />
                  Bot WhatsApp
                  <span className="ml-auto text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">ULTRA</span>
                </NavLink>
              </div>
            </>
          )}
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors mb-2"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
          <div className="px-4 py-2 border-t border-gray-50 mt-2">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">
              Desarrollado por <span className="text-emerald-600/60">@InteliarStack</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
