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
        if (authLoading) return // ESPERAR a que restaure la sesión

        if (!user) {
            navigate('/login')
            return
        }

        const loadStores = async () => {
            try {
                const myStores = await authApi.getMyStores()
                setStores(myStores)
                // ELIMINADO: Auto-selección removida para evitar confusiones y loops
            } catch (err) {
                console.error('Error loading stores:', err)
            } finally {
                setLoading(false)
            }
        }

        loadStores()
    }, [user, authLoading, navigate, selectStore])

    const handleSelect = (storeId: string) => {
        // 1. Guardar en localStorage primero (Sincrónico)
        localStorage.setItem('vendexchat_selected_store', storeId)
        localStorage.removeItem('vendexchat_impersonated_store')

        // 2. Notificar al contexto si es posible, aunque el reload lo pisará
        selectStore(storeId)

        // 3. FULL REFRESH DURO para asegurar que la nueva ID sea la reina
        console.log('[SelectStore] Store selected, forcing full reload to /dashboard...')
        window.location.href = '/dashboard'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Cargando tus tiendas...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[700px] bg-white border-2 border-slate-600 shadow-2xl overflow-hidden">
                {/* Legacy Headers */}
                <div className="bg-[#337ab7] px-8 py-2 text-left">
                    <span className="text-white font-black italic text-xl uppercase tracking-wider">
                        SELECCIONE SUS SUCURSALES
                    </span>
                </div>
                <div className="bg-[#5A616B] px-8 py-2 text-left">
                    <span className="text-white font-black italic text-xl uppercase tracking-wider">
                        PEDIDOS POR WHATSAPP
                    </span>
                </div>

                {/* Main Content */}
                <div className="p-8 flex flex-col items-center">
                    {/* Large Store Icon */}
                    <div className="w-24 h-24 mb-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                        <Store className="w-12 h-12 text-white" />
                    </div>

                    {/* Stores Table-like List */}
                    <div className="w-full border-t border-slate-200">
                        {stores.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 font-bold italic">
                                No se encontraron tiendas vinculadas.
                            </div>
                        ) : (
                            stores.map((store) => (
                                <div
                                    key={store.id}
                                    className="flex items-center justify-between py-6 px-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="w-20">
                                        <div className="w-14 h-14 rounded-xl shadow-md border border-slate-100 overflow-hidden bg-white">
                                            {store.logo_url ? (
                                                <img src={store.logo_url} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                                    <Store className="w-6 h-6 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 px-4">
                                        <h3 className="text-2xl font-bold text-slate-700">
                                            {store.name}
                                        </h3>
                                        <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">
                                            📍 {store.city || 'Sucursal Principal'}
                                        </p>
                                    </div>

                                    <div className="w-32 flex justify-end">
                                        <button
                                            onClick={() => handleSelect(store.id)}
                                            className="bg-[#337ab7] hover:bg-[#286090] text-white font-bold px-6 py-2.5 rounded text-lg transition-all active:scale-95 shadow-md flex items-center gap-2"
                                        >
                                            Ingresar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Hard Reset Option for Debugging */}
                    <div className="mt-8 pt-8 border-t border-slate-100 w-full flex justify-between items-center text-[10px] text-slate-400">
                        <button onClick={logout} className="hover:text-rose-600 font-black uppercase tracking-widest">
                            Cerrar Sesión
                        </button>
                        <div className="flex gap-2">
                            <span>USER: {user?.email}</span>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                className="bg-slate-100 px-2 rounded hover:bg-slate-200"
                            >
                                LIMPIAR TODO
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Bars */}
                <div className="bg-[#337ab7] h-2.5 w-full"></div>
                <div className="bg-[#5A616B] h-2.5 w-full"></div>
            </div>
        </div>
    )
}
