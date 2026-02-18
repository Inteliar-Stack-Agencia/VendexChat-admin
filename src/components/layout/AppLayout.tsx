import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { tenantApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Tenant } from '../../types'
import { LogOut, ShieldAlert } from 'lucide-react'
import { superadminApi } from '../../services/api'
import { Button } from '../common'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const { isSuperadmin } = useAuth()

  // Cargar datos del tenant si es cliente
  useEffect(() => {
    if (!isSuperadmin) {
      tenantApi.getMe().then(setTenant).catch(console.error)
    }
  }, [isSuperadmin])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            storeName={tenant?.name}
            storeSlug={tenant?.slug}
          />

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="animate-fade-in">
              <Outlet context={{ tenant, setTenant }} />
            </div>
          </main>
        </div>
      </div>
      )
}
