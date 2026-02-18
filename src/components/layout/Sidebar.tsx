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
  CreditCard
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
    ? 'bg-emerald-50 text-emerald-700'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, isSuperadmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${isActive
      ? 'bg-blue-600 text-white shadow-inner'
      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0a111a] text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col shadow-xl`}
      >
        {/* Logo / Store Name */}
        <div className="flex items-center justify-between h-16 px-4 bg-[#0d1724]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">VENDExChat</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Dashboard Main Link */}
        <div className="mt-2">
          <NavLink to="/dashboard" className={navClass} onClick={onClose}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
        </div>

        {/* Sección Pedidos */}
        <div className="mt-4">
          <NavLink to="/orders" className={navClass} onClick={onClose}>
            <ShoppingCart className="w-5 h-5" />
            PEDIDOS
          </NavLink>
        </div>

        {/* POS / Ventas */}
        <div>
          <NavLink to="/pos" className={({ isActive }) => `${navClass({ isActive })} mt-0.5`} onClick={onClose}>
            <CreditCard className="w-5 h-5" />
            POS
          </NavLink>
        </div>

        {/* Sección Categorías / Productos Submenu */}
        <div className="mt-4 flex-1">
          <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-[2px]">
            MIS CATEGORIAS
          </div>
          <div className="space-y-0.5 mt-1 opacity-80">
            <NavLink to="/products" className="flex items-center gap-2 px-4 py-1.5 text-[11px] hover:text-blue-400 transition-colors">
              Menu Principal ( 21 )
            </NavLink>
            <NavLink to="/products?cat=veg" className="flex items-center gap-2 px-4 py-1.5 text-[11px] hover:text-blue-400 transition-colors">
              Vegetariano ( 13 )
            </NavLink>
            <NavLink to="/products?cat=ens" className="flex items-center gap-2 px-4 py-1.5 text-[11px] hover:text-blue-400 transition-colors">
              Ensaladas ( 19 )
            </NavLink>
          </div>
        </div>

        {/* Estado y Suscripciones */}
        <div className="p-4 border-t border-gray-800 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Estado de Mi Tienda</p>
            <div className="w-full bg-gray-800 rounded-full h-4 relative">
              <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: '100%' }}></div>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">100%</span>
            </div>
          </div>

          <NavLink to="/subscriptions" className="block text-center py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 rounded-md transition-all">
            SUSCRIPCIONES
          </NavLink>

          <NavLink to="/tienda-vip" className="block text-center py-2 text-xs font-bold text-blue-400 border border-blue-400 hover:bg-blue-400/10 rounded-md transition-all">
            TIENDA VIP
          </NavLink>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-[#0d1724]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 w-full text-xs font-bold text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            CERRAR SESION
          </button>
        </div>
      </aside>
    </>
  )
}
