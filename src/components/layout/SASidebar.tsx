import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Store,
    Users,
    Shield,
    CreditCard,
    Settings,
    LogOut,
    X,
    PieChart,
    Lock
} from 'lucide-react'

interface SASidebarProps {
    isOpen: boolean
    onClose: () => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`

export default function SASidebar({ isOpen, onClose }: SASidebarProps) {
    const { logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } flex flex-col`}
            >
                <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="block font-bold text-slate-900 leading-none">VENDEx</span>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Superadmin</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Principal</p>
                    <NavLink to="/sa/overview" className={linkClass} onClick={onClose}>
                        <LayoutDashboard className="w-5 h-5" />
                        Overview
                    </NavLink>
                    <NavLink to="/sa/tenants" className={linkClass} onClick={onClose}>
                        <Store className="w-5 h-5" />
                        Tiendas (Tenants)
                    </NavLink>

                    <div className="pt-4">
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facturación</p>
                        <NavLink to="/sa/subscriptions" className={linkClass} onClick={onClose}>
                            <Users className="w-5 h-5" />
                            Suscripciones
                        </NavLink>
                        <NavLink to="/sa/payments" className={linkClass} onClick={onClose}>
                            <CreditCard className="w-5 h-5" />
                            Pagos Recibidos
                        </NavLink>
                    </div>

                    <div className="pt-4">
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control</p>
                        <NavLink to="/sa/permissions" className={linkClass} onClick={onClose}>
                            <Lock className="w-5 h-5" />
                            Permisos y Roles
                        </NavLink>
                        <NavLink to="/sa/stats" className={linkClass} onClick={onClose}>
                            <PieChart className="w-5 h-5" />
                            Estadísticas
                        </NavLink>
                        <NavLink to="/sa/settings" className={linkClass} onClick={onClose}>
                            <Settings className="w-5 h-5" />
                            Global Settings
                        </NavLink>
                    </div>
                </nav>

                <div className="p-6 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar sesión SA
                    </button>
                </div>
            </aside>
        </>
    )
}
