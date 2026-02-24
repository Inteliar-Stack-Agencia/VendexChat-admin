import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingSpinner } from '../common'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'client' | 'superadmin'
}

export default function ProtectedRoute({ children, requiredRole = 'client' }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading, isSuperadmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si se requiere rol de cliente y el usuario es superadmin...
  if (requiredRole === 'client' && isSuperadmin) {
    // ...pero tiene una tienda seleccionada (suplantada o manual), permitimos el paso
    const impersonatedId = localStorage.getItem('vendexchat_impersonated_store')
    const selectedStoreId = localStorage.getItem('vendexchat_selected_store')

    if (impersonatedId || selectedStoreId) {
      return <>{children}</>
    }

    // Si no tiene nada seleccionado, obligar a su consola
    return <Navigate to="/sa/overview" replace />
  }

  return <>{children}</>
}

// Ruta protegida solo para superadmin
export function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 border border-rose-100 animate-bounce">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Acceso Denegado (403)</h1>
        <p className="text-slate-500 max-w-md leading-relaxed mb-8">
          Lo sentimos, pero no tienes los permisos globales de <span className="font-bold text-slate-900">SaaS Owner</span> necesarios para acceder a esta consola.<br />
          <span className="text-[10px] text-slate-300 mt-2 block uppercase font-black tracking-widest">Tu rol actual: {user?.role || 'null'}</span>
        </p>
        <Link to="/dashboard" className="bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
          Volver a mi Dashboard de Tienda
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
