import { useState, useEffect } from 'react'
import { Shield, UserPlus, MoreHorizontal, User, Mail, ShieldCheck, Trash2 } from 'lucide-react'
import { superadminApi } from '../../services/api'

export default function SAPermissionsPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        superadminApi.listUsers()
            .then(res => {
                // Filtramos solo los superadmins para esta vista de gestión de staff
                setUsers(res.filter((u: any) => u.role === 'superadmin'))
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Administrativo</h2>
                    <p className="text-slate-500 mt-1">Gestiona los usuarios con acceso total a la consola de control.</p>
                </div>
                <button className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Invitar Admin
                </button>
            </header>

            {/* Staff List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                    </div>
                )}
                <div className="p-8 border-b border-slate-50 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-lg text-slate-900">Administradores Globales</h3>
                </div>

                <div className="divide-y divide-slate-50">
                    {users.map((user) => (
                        <div key={user.id} className="px-8 py-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900 leading-none">{user.full_name || 'Sin nombre'}</p>
                                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Owner</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> {user.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 rounded-lg text-slate-300 hover:text-slate-600 transition-all">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && !loading && (
                        <div className="p-20 text-center text-slate-400 font-bold italic">No hay otros administradores registrados.</div>
                    )}
                </div>
            </div>

            {/* Security Info Card */}
            <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden">
                <div className="relative z-10 max-w-lg">
                    <h3 className="text-xl font-bold mb-2">Seguridad Administrativa</h3>
                    <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                        Cada administrador invitado tiene acceso completo a la base de datos de tiendas, facturación y configuraciones globales. Asegúrate de invitar solo a personal de confianza.
                    </p>
                    <button className="bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-2 rounded-lg transition-colors text-xs border border-white/20">
                        Ver Auditoría de Accesos
                    </button>
                </div>
                <Shield className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10" />
            </div>
        </div>
    )
}
