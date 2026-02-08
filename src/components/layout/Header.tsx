import { Menu, ExternalLink, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  onMenuClick: () => void
  storeName?: string
  storeSlug?: string
}

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'https://vendexchat.app'

export default function Header({ onMenuClick, storeName, storeSlug }: HeaderProps) {
  const { user } = useAuth()

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
        {storeSlug && (
          <a
            href={`${STOREFRONT_URL}/${storeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver mi tienda
          </a>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:block text-sm text-gray-700 max-w-32 truncate">
            {user?.name || user?.email}
          </span>
        </div>
      </div>
    </header>
  )
}
