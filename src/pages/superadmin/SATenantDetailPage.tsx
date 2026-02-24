import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
    Store,
    ChevronLeft,
    MapPin,
    Calendar,
    Shield,
    ExternalLink,
    Mail,
    Smartphone,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    Globe,
    Settings,
    MoreVertical,
    Activity,
    Bot
} from 'lucide-react'
import { superadminApi } from '../../services/api'
import { Tenant } from '../../types'
import { showToast } from '../../components/common/Toast'

export default function SATenantDetailPage() {
    const { id } = useParams()
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [loading, setLoading] = useState(true)
    const [editingSlug, setEditingSlug] = useState(false)
    const [newSlug, setNewSlug] = useState('')
    const [savingSlug, setSavingSlug] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const [savingPrompt, setSavingPrompt] = useState(false)

    useEffect(() => {
        if (id) {
            superadminApi.getTenant(id)
                .then(t => {
                    setTenant(t)
                    setNewSlug(t.slug)
                    setAiPrompt(t.ai_prompt || '')
                })
                .finally(() => setLoading(false))
        }
    }, [id])

    const handleToggleStatus = async () => {
        if (!tenant || !id) return
        try {
            const newStatus = !tenant.is_active
            await superadminApi.updateTenant(id, { is_active: newStatus })
            setTenant({ ...tenant, is_active: newStatus })
            showToast('success', `Tienda ${newStatus ? 'activada' : 'suspendida'} con éxito.`)
        } catch (err) {
            showToast('error', 'Error al cambiar el estado de la tienda.')
        }
    }

    const handleUpdateSlug = async () => {
        if (!tenant || !id || !newSlug.trim()) return
        setSavingSlug(true)
        try {
            const sanitizedSlug = newSlug.trim().toLowerCase().replace(/\s+/g, '-')
            await superadminApi.updateTenant(id, { slug: sanitizedSlug })
            setTenant({ ...tenant, slug: sanitizedSlug })
            setEditingSlug(false)
            showToast('success', 'Slug actualizado correctamente.')
        } catch (err) {
            showToast('error', 'Error al actualizar el slug. Podría estar duplicado.')
        } finally {
            setSavingSlug(false)
        }
    }

    const handleImpersonate = async () => {
        if (!tenant) return
        try {
            showToast('success', `Iniciando sesión como ${tenant.name}...`)
            await superadminApi.impersonate(tenant.id)
        } catch (err) {
            showToast('error', 'Error al intentar suplantar la identidad.')
        }
    }

    const handleUpdatePrompt = async () => {
        if (!tenant || !id) return
        setSavingPrompt(true)
        try {
            await superadminApi.updateTenant(id, { ai_prompt: aiPrompt || null })
            setTenant({ ...tenant, ai_prompt: aiPrompt || null })
            showToast('success', 'Prompt de IA actualizado correctamente.')
        } catch (err: any) {
            console.error('Update Prompt Error:', err)
            showToast('error', `Error al actualizar el prompt de IA: ${err.message || 'Error desconocido'}`)
        } finally {
            setSavingPrompt(false)
        }
    }

    if (loading) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Cargando ficha técnica del tenant...</div>
    }

    if (!tenant) {
        return <div className="p-20 text-center text-rose-600 font-bold">Error: El tenant solicitado no existe.</div>
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="flex items-center gap-4">
                <Link to="/sa/tenants" className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{tenant.name}</h2>
                        <span className={`px-3 py-1 text-xs font-black rounded-full border uppercase tracking-widest ${tenant.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {tenant.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        ID: {tenant.id} • {tenant.email || 'Sin email'}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8 min-h-screen">
                    {/* AI Prompt Restriction Section */}
                    <div key={`ai-prompt-${tenant.id}-${aiPrompt ? 'filled' : 'empty'}`} className="bg-white rounded-[2rem] border border-indigo-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="p-8 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">
                                    Prompt del Asistente Virtual (Restringido)
                                </h3>
                            </div>
                            <span className="px-2 py-1 bg-indigo-600 text-[8px] font-black text-white uppercase tracking-widest rounded-md">Solo Soporte</span>
                        </div>
                        <div className="p-8 space-y-4">
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">Este prompt define la personalidad y conocimientos del bot. El dueño de la tienda no tiene acceso a este campo y solo puede verse desde esta consola global.</p>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                                placeholder="Introduce las instrucciones del sistema para la IA (ej: Eres un asistente experto en ventas...)"
                            />
                            <div className="flex justify-end gap-3 items-center">
                                {savingPrompt && <span className="text-[10px] font-bold text-slate-400 animate-pulse">Guardando cambios...</span>}
                                <button
                                    onClick={handleUpdatePrompt}
                                    disabled={savingPrompt}
                                    className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                                >
                                    {savingPrompt ? 'Actualizando...' : 'Actualizar Prompt'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Card */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                Configuración del Tenant
                            </h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Slug del Negocio</label>
                                    <div className="flex items-center gap-2">
                                        {editingSlug ? (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newSlug}
                                                    onChange={(e) => setNewSlug(e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                />
                                                <button
                                                    onClick={handleUpdateSlug}
                                                    disabled={savingSlug}
                                                    className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                >
                                                    {savingSlug ? '...' : 'OK'}
                                                </button>
                                                <button
                                                    onClick={() => { setEditingSlug(false); setNewSlug(tenant.slug); }}
                                                    className="px-3 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300"
                                                >
                                                    X
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="font-bold text-slate-900">/{tenant.slug}</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => setEditingSlug(true)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
                                                        Editar
                                                    </button>
                                                    <a href={`https://${tenant.slug}.vendexchat.app`} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">País / Región</label>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-900">AR</span>
                                        <Globe className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Estado de la Cuenta</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tenant.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tenant.is_active ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 capitalize">{tenant.is_active ? 'Online' : 'Offline'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl opacity-50">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 text-slate-300">
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 capitalize">Plan Free</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Placeholder */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-lg text-slate-900">Actividad Reciente</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            {[
                                { event: 'Tienda detectada en sistema', time: new Date(tenant.created_at).toLocaleDateString() },
                                { event: 'Configuración inicial completada', time: 'Sistema' }
                            ].map((activity, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{activity.event}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-8">
                {/* Quick Actions */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 mb-4">Acciones Críticas</h3>
                    <button
                        onClick={handleImpersonate}
                        className="w-full bg-slate-100 text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        Iniciar Sesión como Merchant
                    </button>
                    <button
                        onClick={handleToggleStatus}
                        className={`w-full border font-bold py-3 rounded-xl transition-colors ${tenant.is_active ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                        {tenant.is_active ? 'Suspender Tienda' : 'Activar Tienda'}
                    </button>
                </div>

                {/* Contact Details */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Datos de Contacto</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</p>
                                <p className="text-sm font-bold text-slate-900 truncate">{tenant.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp</p>
                                <p className="text-sm font-bold text-slate-900">+{tenant.whatsapp || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Miembro desde</p>
                                <p className="text-sm font-bold text-slate-900">{new Date(tenant.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
