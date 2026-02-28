import { useParams } from 'react-router-dom'
import { ChevronLeft, Mail, Smartphone, Users, DollarSign, Activity } from 'lucide-react'
import { useTenantDetail } from '../../hooks/useTenantDetail'
import TenantGeneralConfig from './components/TenantGeneralConfig'
import TenantAiConfig from './components/TenantAiConfig'
import TenantPaymentGateways from './components/TenantPaymentGateways'
import TenantCriticalActions from './components/TenantCriticalActions'

export default function SATenantDetailPage() {
    const { id } = useParams()
    const {
        tenant,
        loading,
        saving,
        tenantGateways,
        updateTenant,
        updateMetadata,
        changePlan,
        connectGateway,
        disconnectGateway,
        impersonate,
        deleteTenant
    } = useTenantDetail(id)

    if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Cargando ficha técnica del tenant...</div>
    if (!tenant) return <div className="p-20 text-center text-rose-600 font-bold">Error: El tenant solicitado no existe.</div>

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
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
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

                    <TenantAiConfig
                        tenant={tenant}
                        onUpdatePrompt={(prompt) => updateMetadata({ ai_prompt: prompt })}
                        isSaving={saving.metadata}
                    />

                    <TenantGeneralConfig
                        tenant={tenant}
                        onUpdate={updateTenant}
                        onChangePlan={changePlan}
                        isSavingGeneral={saving.general}
                        isSavingPlan={saving.plan}
                    />

                    <TenantPaymentGateways
                        gateways={tenantGateways}
                        onConnect={connectGateway}
                        onDisconnect={disconnectGateway}
                        isSaving={saving.gateway}
                    />

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-lg text-slate-900">Actividad Reciente</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            {[
                                { event: 'Tienda detectada en sistema', time: new Date(tenant.created_at || '').toLocaleDateString() },
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

                <div className="space-y-8">
                    <TenantCriticalActions
                        tenant={tenant}
                        onToggleStatus={async () => { await updateTenant({ is_active: !tenant.is_active }) }}
                        onImpersonate={impersonate}
                        onDelete={deleteTenant}
                    />

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
        </div>
    )
}
