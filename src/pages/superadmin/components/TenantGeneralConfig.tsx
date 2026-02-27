import { useState } from 'react'
import { Shield, ExternalLink, Globe, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react'
import { Tenant } from '../../../types'

interface TenantGeneralConfigProps {
    tenant: Tenant
    onUpdate: (data: Partial<Tenant>) => Promise<boolean>
    onChangePlan: (plan: string) => Promise<boolean>
    isSavingGeneral: boolean
    isSavingPlan: boolean
}

export default function TenantGeneralConfig({ tenant, onUpdate, onChangePlan, isSavingGeneral, isSavingPlan }: TenantGeneralConfigProps) {
    const [editingSlug, setEditingSlug] = useState(false)
    const [newSlug, setNewSlug] = useState(tenant.slug)
    const [editingDomain, setEditingDomain] = useState(false)
    const [newDomain, setNewDomain] = useState(tenant.custom_domain || '')

    const handleUpdateSlug = async () => {
        const sanitized = newSlug.trim().toLowerCase().replace(/\s+/g, '-')
        const success = await onUpdate({ slug: sanitized })
        if (success) setEditingSlug(false)
    }

    const handleUpdateDomain = async () => {
        const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '')
        const success = await onUpdate({ custom_domain: domain || null })
        if (success) setEditingDomain(false)
    }

    return (
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
                                    <button onClick={handleUpdateSlug} disabled={isSavingGeneral} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">OK</button>
                                    <button onClick={() => { setEditingSlug(false); setNewSlug(tenant.slug); }} className="px-3 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300">X</button>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="font-bold text-slate-900">/{tenant.slug}</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setEditingSlug(true)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">Editar</button>
                                        <a href={`https://vendexchat.app/${tenant.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-slate-400 hover:text-indigo-600" /></a>
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

                <div>
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
                                <button onClick={handleUpdateDomain} disabled={isSavingGeneral} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50">OK</button>
                                <button onClick={() => { setEditingDomain(false); setNewDomain(tenant.custom_domain || ''); }} className="px-3 py-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300">X</button>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className={`font-bold ${tenant.custom_domain ? 'text-slate-900' : 'text-slate-300'}`}>{tenant.custom_domain || 'Sin dominio propio'}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setEditingDomain(true)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">{tenant.custom_domain ? 'Editar' : 'Agregar'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Estado y Plan</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tenant.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {tenant.is_active ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            </div>
                            <span className="text-xs font-bold text-slate-700 capitalize">{tenant.is_active ? 'Online' : 'Offline'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                                <CreditCard className="w-4 h-4" />
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{tenant.metadata?.plan_type || 'Free'}</span>
                                <select
                                    value={tenant.metadata?.plan_type || 'free'}
                                    onChange={(e) => onChangePlan(e.target.value)}
                                    disabled={isSavingPlan}
                                    className="text-[9px] font-black text-indigo-600 outline-none hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md transition-all"
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
    )
}
