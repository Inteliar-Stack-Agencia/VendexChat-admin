import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Settings,
  LogOut,
  X,
  Store,
  Users,
  Shield,
  Percent,
  CreditCard,
  Clock,
  Zap,
  DollarSign
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, isSuperadmin } = useAuth()
  const navigate = useNavigate()

  const linkClass = ({ isActive }: { isActive: boolean }) => {
    const activeColors = isSuperadmin
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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSuperadmin ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">VENDExChat</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isSuperadmin ? (
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
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">General</p>
                <NavLink to="/dashboard" className={linkClass} onClick={onClose}>
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </NavLink>
                <NavLink to="/orders" className={linkClass} onClick={onClose}>
                  <ShoppingCart className="w-5 h-5" />
                  Pedidos
                </NavLink>
              </div>

              <div className="pt-2 pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catálogo</p>
                <NavLink to="/products" className={linkClass} onClick={onClose}>
                  <Package className="w-5 h-5" />
                  Productos
                </NavLink>
                <NavLink to="/categories" className={linkClass} onClick={onClose}>
                  <FolderOpen className="w-5 h-5" />
                  Categorías
                </NavLink>
              </div>

              <div className="pt-2 pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clientes y Marketing</p>
                <NavLink to="/customers" className={linkClass} onClick={onClose}>
                  <Users className="w-5 h-5" />
                  Clientes
                </NavLink>
                <NavLink to="/coupons" className={linkClass} onClick={onClose}>
                  <Percent className="w-5 h-5" />
                  Cupones
                </NavLink>
              </div>

              <div className="pt-2 pb-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuración</p>
                <NavLink to="/settings" className={linkClass} onClick={onClose}>
                  <Settings className="w-5 h-5" />
                  Tienda
                </NavLink>
                <NavLink to="/horarios" className={linkClass} onClick={onClose}>
                  <Clock className="w-5 h-5" />
                  Horarios
                </NavLink>
                <NavLink to="/subscription" className={linkClass} onClick={onClose}>
                  <Zap className="w-5 h-5" />
                  Mi Plan
                </NavLink>
                <NavLink to="/payments" className={linkClass} onClick={onClose}>
                  <CreditCard className="w-5 h-5" />
                  Pagos
                </NavLink>
              </div>
            </>
          )}
        </nav>

        {/* Cerrar sesión */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
