import { useState, useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { tenantApi, superadminApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Tenant } from '../../types'
import { LogOut, ShieldAlert } from 'lucide-react'
import { Button } from '../common'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const { isSuperadmin, selectedStoreId, loading } = useAuth()
  const isImpersonating = !!localStorage.getItem('vendexchat_impersonated_store')

  useEffect(() => {
    // Siempre cargar si NO es superadmin, O si es superadmin pero tiene una tienda seleccionada (o suplantada)
    if (!isSuperadmin || isImpersonating || selectedStoreId) {
      tenantApi.getMe().then(setTenant).catch((err) => {
        console.error('Error fetching tenant:', err)
        // Si falla al cargar el tenant suplantado, quizás el ID es viejo
        if (isImpersonating) localStorage.removeItem('vendexchat_impersonated_store')
      })
    }
  }, [isSuperadmin, isImpersonating, selectedStoreId, loading])

  const handleStopImpersonation = () => {
    superadminApi.stopImpersonation()
  }

  // No redireccionar por JS en el Layout; dejar que el Router maneje esto para evitar loops

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-2">

      {isImpersonating && (
        <div className="bg-slate-900 border-b border-white/10 px-6 py-2 flex items-center justify-between animate-in slide-in-from-top duration-500 relative z-[60]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Modo Suplantación: <span className="text-emerald-400">{tenant?.name || 'Cargando...'}</span>
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStopImpersonation}
            className="h-8 !px-3 !bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Salir
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} modifiersEnabled={!!(tenant?.metadata as any)?.modifiers_enabled} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            storeName={tenant?.name}
            storeSlug={tenant?.slug}
            storeCity={tenant?.city}
          />

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="animate-fade-in">
              {/* Si la tienda está suspendida y no somos superadmin (ni estamos en modo suplantación), mostramos aviso */}
              {tenant && !tenant.is_active && !isSuperadmin ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border border-rose-100 shadow-sm text-center">
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-600 mb-6">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Tienda Suspendida</h2>
                  <p className="text-slate-500 max-w-sm mx-auto">Esta tienda ha sido suspendida temporalmente por administración. Por favor, contacta a soporte para más detalles.</p>
                </div>
              ) : (
                <Outlet context={{ tenant, setTenant }} />
              )}
            </div>
          </main>

          <footer className="border-t border-slate-200 px-6 py-3 flex items-center justify-center gap-6">
            <Link to="/terms" target="_blank" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Términos y Condiciones
            </Link>
            <span className="text-slate-300 text-xs">·</span>
            <Link to="/privacy" target="_blank" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Política de Privacidad
            </Link>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-xs text-slate-300">© 2026 Inteliar Stack</span>
          </footer>
        </div>
      </div>
    </div>
  )
}
