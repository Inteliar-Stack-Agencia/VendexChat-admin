import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, ChevronRight, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import { Tenant } from '../../types'

export default function SelectStorePage() {
    const { user, loading: authLoading, selectStore, logout } = useAuth()
    const navigate = useNavigate()
    const [stores, setStores] = useState<Tenant[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            navigate('/login')
            return
        }

        const loadStores = async () => {
            try {
                const myStores = await authApi.getMyStores()
                setStores(myStores)
            } catch (err) {
                console.error('Error loading stores:', err)
            } finally {
                setLoading(false)
            }
        }

        loadStores()
    }, [user, authLoading, navigate, selectStore])

    const handleSelect = (storeId: string) => {
        localStorage.setItem('vendexchat_selected_store', storeId)
        localStorage.removeItem('vendexchat_impersonated_store')
        selectStore(storeId)
        window.location.href = '/dashboard'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-gray-500">Cargando tus sucursales...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo - Mismo estilo que LoginPage */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
                        <Store className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">VendexChat</h1>
                    <p className="text-gray-500 mt-1">Seleccioná tu sucursal</p>
                </div>

                {/* Card de sucursales */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Tus sucursales</h2>
                    <p className="text-sm text-gray-500 mb-6">Elegí a cuál querés ingresar</p>

                    {stores.length === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                            No se encontraron sucursales vinculadas.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stores.map((store) => (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelect(store.id)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
                                >
                                    {/* Logo de la tienda */}
                                    <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                                        {store.logo_url ? (
                                            <img src={store.logo_url} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Store className="w-5 h-5 text-gray-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 text-left">
                                        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                            {store.name}
                                        </h3>
                                        {store.city && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                📍 {store.city}
                                            </p>
                                        )}
                                    </div>

                                    {/* Flecha */}
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-between items-center">
                    <button
                        onClick={logout}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                    </button>
                    <span className="text-xs text-gray-400">{user?.email}</span>
                </div>
            </div>
        </div>
    )
}
