import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, ChevronRight, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import { Tenant } from '../../types'

export default function SelectStorePage() {
    const { user, selectStore, logout } = useAuth()
    const navigate = useNavigate()
    const [stores, setStores] = useState<Tenant[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }

        const loadStores = async () => {
            try {
                const myStores = await authApi.getMyStores()
                setStores(myStores)

                // Si solo tiene una tienda, seleccionarla automáticamente
                if (myStores.length === 1) {
                    selectStore(myStores[0].id)
                    navigate('/dashboard')
                }
            } catch (err) {
                console.error('Error loading stores:', err)
            } finally {
                setLoading(false)
            }
        }

        loadStores()
    }, [user, navigate, selectStore])

    const handleSelect = (storeId: string) => {
        selectStore(storeId)
        navigate('/dashboard')
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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col pt-12 lg:pt-20 px-6 pb-12">
            <div className="max-w-4xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-12">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 border border-slate-100">
                        <Store className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-4 uppercase">
                        Seleccione su Sucursales
                    </h1>
                    <p className="text-slate-500 font-medium max-w-md">
                        Bienvenido de nuevo, {user?.name}. Elige en qué negocio deseas trabajar hoy.
                    </p>
                </div>

                {/* Grid de Tiendas */}
                {stores.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-sm">
                        <p className="text-slate-400 font-bold text-lg mb-6">No se encontraron tiendas vinculadas a este email.</p>
                        <button
                            onClick={logout}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 mx-auto hover:bg-indigo-700 transition-all hover:scale-105"
                        >
                            <LogOut className="w-5 h-5" /> Regresar al Login
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stores.map((store) => (
                            <button
                                key={store.id}
                                onClick={() => handleSelect(store.id)}
                                className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all text-left overflow-hidden ring-0 hover:ring-2 hover:ring-indigo-600/10"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors overflow-hidden">
                                        {store.logo_url ? (
                                            <img src={store.logo_url} alt={store.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Store className="w-8 h-8 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                            {store.name}
                                        </h3>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">
                                            /{store.slug}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Decoración de fondo */}
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl group-hover:bg-indigo-600/10 transition-colors" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Footer del Selector */}
                <div className="mt-12 flex items-center justify-center gap-4">
                    <button
                        onClick={logout}
                        className="text-slate-400 hover:text-rose-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors py-2 px-4 rounded-lg hover:bg-rose-50"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    )
}
