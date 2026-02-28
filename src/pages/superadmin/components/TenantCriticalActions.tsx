import { useState } from 'react'
import { Shield, Copy, ExternalLink, Activity, Trash2 } from 'lucide-react'
import { Tenant } from '../../../types'
import SACloneTenantModal from '../SACloneTenantModal'
import SADeleteTenantModal from '../SADeleteTenantModal'
import { superadminApi } from '../../../services/api'

interface TenantCriticalActionsProps {
    tenant: Tenant
    onToggleStatus: () => Promise<void>
    onImpersonate: () => Promise<void>
    onDelete: () => Promise<boolean>
}

export default function TenantCriticalActions({ tenant, onToggleStatus, onImpersonate, onDelete }: TenantCriticalActionsProps) {
    const [showClone, setShowClone] = useState(false)
    const [showDelete, setShowDelete] = useState(false)

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Acciones Críticas
                </h3>
                <p className="text-[10px] text-slate-400 font-medium pb-2 border-b border-slate-50">Gestioná el acceso y ciclo de vida de la tienda.</p>

                <button
                    onClick={() => setShowClone(true)}
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 group"
                >
                    <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" /> Clonar Tienda (Multi-Sede)
                </button>

                <button
                    onClick={onImpersonate}
                    className="w-full bg-slate-50 text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                    <ExternalLink className="w-4 h-4 text-slate-400" /> Iniciar Sesión (Simulador)
                </button>

                <button
                    onClick={onToggleStatus}
                    className={`w-full border font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 ${tenant.is_active ? 'border-rose-100 text-rose-600 hover:bg-rose-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}
                >
                    <Activity className="w-4 h-4" /> {tenant.is_active ? 'Suspender Merchant' : 'Activar Merchant'}
                </button>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-rose-100 shadow-sm shadow-rose-50/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 text-rose-600">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-0.5">Zona de Peligro</h4>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">Acciones irreversibles.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDelete(true)}
                    className="w-full py-4 bg-white border-2 border-rose-100 text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                    <Trash2 className="w-4 h-4" /> Eliminar Tienda
                </button>
            </div>

            {showClone && (
                <SACloneTenantModal
                    sourceTenant={tenant}
                    onClose={() => setShowClone(false)}
                    onClone={(data) => superadminApi.cloneTenant(tenant.id, data)}
                    onSuccess={(newId) => {
                        setShowClone(false)
                        window.location.href = `/sa/tenants/${newId}`
                    }}
                />
            )}

            {showDelete && (
                <SADeleteTenantModal
                    tenant={tenant}
                    onClose={() => setShowDelete(false)}
                    onConfirm={async () => { await onDelete() }}
                />
            )}
        </div>
    )
}
