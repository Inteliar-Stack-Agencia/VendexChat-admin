import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { tenantApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Tenant } from '../../types'

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
    <div className="min-h-screen bg-gray-50 flex">
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
