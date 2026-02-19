import { Menu, ExternalLink, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  onMenuClick: () => void
  storeName?: string
  storeSlug?: string
}

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'https://vendexchat.app'

export default function Header({ onMenuClick, storeName, storeSlug }: HeaderProps) {
  const { user, isSuperadmin } = useAuth()
  const isImpersonating = !!localStorage.getItem('vendexchat_impersonated_store')

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {storeName || 'Mi Tienda'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {(storeSlug && STOREFRONT_URL) ? (
          <a
            href={`${STOREFRONT_URL}/${storeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${(isSuperadmin && !isImpersonating)
              ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
              }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver mi tienda
          </a>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 cursor-help" title="Configura tu slug en ajustes">
            Tienda inactiva
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${(isSuperadmin && !isImpersonating) ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:block text-sm text-gray-700 max-w-32 truncate">
            {isImpersonating ? (storeName || 'Merchant Mode') : (user?.name || user?.email)}
          </span>
        </div>
      </div>
    </header>
  )
}
