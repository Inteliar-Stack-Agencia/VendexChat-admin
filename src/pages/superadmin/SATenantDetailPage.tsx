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
    Activity,
    Bot,
    Copy,
    UserPlus,
    DollarSign,
    Users,
    Trash2
} from 'lucide-react'
import { superadminApi } from '../../services/api'
import { Tenant } from '../../types'
import { showToast } from '../../components/common/Toast'
import SACloneTenantModal from './SACloneTenantModal'
import SADeleteTenantModal from './SADeleteTenantModal'

export default function SATenantDetailPage() {
    const { id } = useParams()
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [loading, setLoading] = useState(true)
    const [editingSlug, setEditingSlug] = useState(false)
    const [newSlug, setNewSlug] = useState('')
    const [savingSlug, setSavingSlug] = useState(false)
    const [editAiPrompt, setEditAiPrompt] = useState('')
    const [editAnnounceActive, setEditAnnounceActive] = useState(false)
    const [editAnnounceText, setEditAnnounceText] = useState('')
    const [savingPrompt, setSavingPrompt] = useState(false)
    const [savingPlan, setSavingPlan] = useState(false)
    const [showCloneModal, setShowCloneModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [editingDomain, setEditingDomain] = useState(false)
    const [newDomain, setNewDomain] = useState('')
    const [savingDomain, setSavingDomain] = useState(false)
    const [tenantGateways, setTenantGateways] = useState<any[]>([])
    const [showGatewayForm, setShowGatewayForm] = useState(false)
    const [gatewayForm, setGatewayForm] = useState({ provider: 'mercadopago', public_key: '', secret_key: '' })
    const [savingGateway, setSavingGateway] = useState(false)

    useEffect(() => {
        if (id) {
            superadminApi.getTenant(id)
                .then(t => {
                    setTenant(t)
                    setNewSlug(t.slug)
                    setNewDomain(t.custom_domain || '')
                    // Pick from metadata as primary source for prompt
                    setEditAiPrompt(t.metadata?.ai_prompt || t.ai_prompt || '')
                    setEditAnnounceActive(t.metadata?.announcement_active === true || t.metadata?.announcement_active === "true")
                    setEditAnnounceText(t.metadata?.announcement_text || '')
                    // Load gateways for this tenant
                    superadminApi.listTenantGateways(t.id).then(setTenantGateways).catch(console.error)
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

    const handleUpdateDomain = async () => {
        if (!tenant || !id) return
        setSavingDomain(true)
        try {
            const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '')
            await superadminApi.updateTenant(id, { custom_domain: domain || null })
            setTenant({ ...tenant, custom_domain: domain || null })
            setEditingDomain(false)
            showToast('success', domain ? `Dominio actualizado: ${domain}` : 'Dominio personalizado eliminado.')
        } catch (err) {
            showToast('error', 'Error al actualizar el dominio.')
        } finally {
            setSavingDomain(false)
        }
    }

    const handleConnectGateway = async () => {
        if (!tenant || !id) return
        setSavingGateway(true)
        try {
            const result = await superadminApi.connectTenantGateway(tenant.id, gatewayForm.provider, {
                public_key: gatewayForm.public_key,
                secret_key: gatewayForm.secret_key
            })
            setTenantGateways(prev => [...prev.filter((g: any) => g.provider !== gatewayForm.provider), result])
            setShowGatewayForm(false)
            setGatewayForm({ provider: 'mercadopago', public_key: '', secret_key: '' })
            showToast('success', `Pasarela ${gatewayForm.provider} vinculada correctamente.`)
        } catch (err) {
            showToast('error', 'Error al vincular la pasarela.')
        } finally {
            setSavingGateway(false)
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
            const updatedMetadata = {
                ...(tenant.metadata || {}),
                ai_prompt: editAiPrompt || null
            }
            await superadminApi.updateTenant(id, { metadata: updatedMetadata })
            setTenant({ ...tenant, metadata: updatedMetadata })
            showToast('success', 'Prompt de IA actualizado correctamente.')
        } catch (err: any) {
            console.error('Update Prompt Error:', err)
            showToast('error', `Error al actualizar el prompt de IA: ${err.message || 'Error desconocido'}`)
        } finally {
            setSavingPrompt(false)
        }
    }

    const handleChangePlan = async (targetPlan: 'free' | 'pro' | 'vip' | 'ultra') => {
        if (!tenant || !id) return
        setSavingPlan(true)
        try {
            const updatedMetadata = {
                ...(tenant.metadata || {}),
                plan_type: targetPlan
            }
            // 1. Update store metadata
            await superadminApi.updateTenant(id, { metadata: updatedMetadata })

            // 2. Update/Create subscription record
            await superadminApi.updateSubscription(id, {
                plan_type: targetPlan,
                status: 'active',
                current_period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString(), // 10 years for manual admin upgrades
                billing_cycle: 'annual'
            })

            setTenant({ ...tenant, metadata: updatedMetadata })
            showToast('success', `Plan actualizado a ${targetPlan.toUpperCase()} con éxito!`)
        } catch (err: any) {
            console.error('Change Plan Error:', err)
            showToast('error', `Error al cambiar el plan: ${err.message || 'Error desconocido'}`)
        } finally {
            setSavingPlan(false)
        }
    }

    const handleDeleteTenant = async () => {
        if (!tenant || !id) return
        try {
            await superadminApi.deleteTenant(id)
            showToast('success', 'Tienda eliminada permanentemente.')
            window.location.href = '/sa/tenants'
        } catch (err: any) {
            console.error('Delete Tenant Error:', err)
            showToast('error', `Error al eliminar: ${err.message}`)
            setShowDeleteModal(false)
        }
    }

    if (loading) {
        return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Cargando ficha técnica del tenant...</div>
    }

    if (!tenant) {
        return <div className="p-20 text-center text-rose-600 font-bold">Error: El tenant solicitado no existe.</div>
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div
                        onClick={() => window.history.back()}
                        className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all cursor-pointer group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{tenant.name}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${tenant.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                {tenant.is_active ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium flex items-center gap-2">
                            <code className="bg-slate-50 px-2 py-0.5 rounded text-indigo-600 font-bold">/{tenant.slug}</code>
                            <span>•</span>
                            <span className="text-xs">ID: {tenant.id}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="bg-indigo-600 text-white font-black px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95">
                        <UserPlus className="w-4 h-4" /> Gestionar Accesos
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Dashboard Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-indigo-100 transition-all cursor-default">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Usuarios</p>
                                <p className="text-2xl font-black text-slate-900">1</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-indigo-100 transition-all cursor-default">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Facturación Estimada</p>
                                <p className="text-2xl font-black text-slate-900">$0.00</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Prompt Restriction Section */}
                    <div key={`ai-prompt-${tenant.id}-${editAiPrompt ? 'filled' : 'empty'}`} className="bg-white rounded-[2rem] border border-indigo-100 shadow-sm overflow-hidden">
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
                                value={editAiPrompt}
                                onChange={(e) => setEditAiPrompt(e.target.value)}
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
                                                    <a href={`https://vendexchat.app/${tenant.slug}`} target="_blank" rel="noreferrer">
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
                                        <span className="font-bold text-slate-900">{tenant.country || 'Sin definir'}</span>
                                        <Globe className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Custom Domain */}
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Dominio Personalizado</label>
                                <div className="flex items-center gap-2">
                                    {editingDomain ? (
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="text"
                                                value={newDomain}
                                                onChange={(e) => setNewDomain(e.target.value)}
                                                placeholder="www.mitienda.com"
                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                            <button
                                                onClick={handleUpdateDomain}
                                                disabled={savingDomain}
                                                className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {savingDomain ? '...' : 'OK'}
                                            </button>
                                            <button
                                                onClick={() => { setEditingDomain(false); setNewDomain(tenant.custom_domain || ''); }}
                                                className="px-3 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300"
                                            >
                                                X
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-slate-400" />
                                                <span className={`font-bold ${tenant.custom_domain ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {tenant.custom_domain || 'Sin dominio propio'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setEditingDomain(true)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
                                                    {tenant.custom_domain ? 'Editar' : 'Agregar'}
                                                </button>
                                                {tenant.custom_domain && (
                                                    <a href={`https://${tenant.custom_domain}`} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-1.5">Requiere CNAME apuntando a Cloudflare Pages + agregar dominio en CF.</p>
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
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{tenant.metadata?.plan_type || 'Free'}</span>
                                                    {tenant.metadata?.plan_type === 'pro' && (
                                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Prueba Activa</span>
                                                    )}
                                                    <select
                                                        value={tenant.metadata?.plan_type || 'free'}
                                                        onChange={(e) => handleChangePlan(e.target.value as any)}
                                                        disabled={savingPlan}
                                                        className="text-[9px] font-black text-indigo-600 outline-none hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md transition-all active:scale-95"
                                                    >
                                                        <option value="free">FREE</option>
                                                        <option value="pro">PRO</option>
                                                        <option value="vip">VIP</option>
                                                        <option value="ultra">ULTRA</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Gateway Section */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">Pasarela de Pagos</h3>
                            </div>
                            {tenantGateways.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    <CheckCircle className="w-3 h-3" /> Conectada
                                </span>
                            )}
                            {tenantGateways.length === 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100">
                                    Sin Configurar
                                </span>
                            )}
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Existing gateways */}
                            {tenantGateways.map((gw: any) => (
                                <div key={gw.id} className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-emerald-100">
                                            <CreditCard className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 uppercase">{gw.provider}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {gw.config?.public_key ? `${gw.config.public_key.slice(0, 20)}...` : 'Keys configuradas'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('¿Desconectar esta pasarela?')) return
                                            try {
                                                await superadminApi.disconnectTenantGateway(gw.id)
                                                setTenantGateways(prev => prev.filter((g: any) => g.id !== gw.id))
                                                showToast('success', 'Pasarela desconectada')
                                            } catch { showToast('error', 'Error al desconectar') }
                                        }}
                                        className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest"
                                    >
                                        Desconectar
                                    </button>
                                </div>
                            ))}

                            {/* Connect new gateway form */}
                            {showGatewayForm ? (
                                <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Proveedor</label>
                                        <select
                                            value={gatewayForm.provider}
                                            onChange={e => setGatewayForm(prev => ({ ...prev, provider: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        >
                                            <option value="mercadopago">Mercado Pago</option>
                                            <option value="stripe">Stripe</option>
                                            <option value="paypal">PayPal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Public Key</label>
                                        <input
                                            type="text"
                                            value={gatewayForm.public_key}
                                            onChange={e => setGatewayForm(prev => ({ ...prev, public_key: e.target.value }))}
                                            placeholder="PUBLIC_KEY o APP_USR-..."
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Secret Key / Access Token</label>
                                        <input
                                            type="password"
                                            value={gatewayForm.secret_key}
                                            onChange={e => setGatewayForm(prev => ({ ...prev, secret_key: e.target.value }))}
                                            placeholder="SECRET_KEY o ACCESS_TOKEN"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={() => { setShowGatewayForm(false); setGatewayForm({ provider: 'mercadopago', public_key: '', secret_key: '' }) }}
                                            className="px-4 py-2.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-300 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleConnectGateway}
                                            disabled={savingGateway || !gatewayForm.public_key || !gatewayForm.secret_key}
                                            className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200"
                                        >
                                            {savingGateway ? 'Conectando...' : '+ Vincular Pasarela'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowGatewayForm(true)}
                                    className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all"
                                >
                                    + Conectar Pasarela de Pagos
                                </button>
                            )}
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
                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-600" />
                            Acciones Críticas
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium pb-2 border-b border-slate-50">Gestioná el acceso y ciclo de vida de la tienda.</p>
                        <button
                            onClick={() => setShowCloneModal(true)}
                            className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 group"
                        >
                            <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" /> Clonar Tienda (Multi-Sede)
                        </button>
                        <button
                            onClick={handleImpersonate}
                            className="w-full bg-slate-50 text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4 text-slate-400" /> Iniciar Sesión (Simulador)
                        </button>
                        <button
                            onClick={handleToggleStatus}
                            className={`w-full border font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 ${tenant.is_active ? 'border-rose-100 text-rose-600 hover:bg-rose-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                            <Activity className="w-4 h-4" /> {tenant.is_active ? 'Suspender Merchant' : 'Activar Merchant'}
                        </button>

                    </div>

                    {/* Anuncio de Tienda */}
                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Anuncio de Tienda</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Banner informativo específico para este comercio</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={editAnnounceActive}
                                    onChange={(e) => setEditAnnounceActive(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {editAnnounceActive && (
                            <textarea
                                value={editAnnounceText}
                                onChange={(e) => setEditAnnounceText(e.target.value)}
                                placeholder="Ej: ¡Oferta relámpago! 20% OFF en toda la tienda hoy."
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-indigo-500 focus:bg-white transition-all outline-none resize-none"
                                rows={3}
                            />
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-[2rem] p-8 border border-rose-100 shadow-sm shadow-rose-50/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 text-rose-600">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-0.5">Zona de Peligro</h4>
                                <p className="text-[10px] text-slate-400 font-medium leading-tight">Acciones irreversibles de gestión.</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-6">Eliminar una tienda borrará permanentemente todos sus productos, categorías y pedidos vinculados. Esta acción no se puede deshacer.</p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full py-4 bg-white border-2 border-rose-100 text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Eliminar Tienda
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
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Comercial</p>
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
                        </div>
                    </div>
                </div>
            </div>

            {showCloneModal && (
                <SACloneTenantModal
                    sourceTenant={tenant}
                    onClose={() => setShowCloneModal(false)}
                    onClone={(data) => superadminApi.cloneTenant(tenant.id, data)}
                    onSuccess={(newId) => {
                        setShowCloneModal(false)
                        showToast('success', '¡Tienda clonada con éxito! Redirigiendo...')
                        window.location.href = `/sa/tenants/${newId}`
                    }}
                />
            )}
            {showDeleteModal && (
                <SADeleteTenantModal
                    tenant={tenant}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteTenant}
                />
            )}
        </div>
    )
}
