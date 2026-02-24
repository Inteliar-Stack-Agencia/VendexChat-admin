import { useState } from 'react'
import { X, AlertTriangle, Trash2, RefreshCw, CheckCircle } from 'lucide-react'
import { Tenant } from '../../types'

interface SADeleteTenantModalProps {
    tenant: Tenant
    onClose: () => void
    onConfirm: () => Promise<void>
}

export default function SADeleteTenantModal({ tenant, onClose, onConfirm }: SADeleteTenantModalProps) {
    const [confirmName, setConfirmName] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Comparación ultra robusta: ignoramos todos los espacios, acentos y mayúsculas
    const normalize = (str: string) => str.trim().toLowerCase().replace(/\s/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    const isConfirmed = normalize(confirmName) === normalize(tenant.name)

    const handleDelete = async () => {
        if (!isConfirmed) return

        setIsDeleting(true)
        setError(null)
        try {
            await onConfirm()
        } catch (err: any) {
            console.error('Delete Error:', err)
            setError(err.message || 'Error al intentar eliminar la tienda. Inténtelo de nuevo.')
            setIsDeleting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-rose-100 flex flex-col scale-100 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-rose-50 bg-rose-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg shadow-rose-200">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Eliminar Tienda</h3>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Acción Irreversible</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-50"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Warning Box */}
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Atención: Destrucción Total</p>
                            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                Esta acción eliminará permanentemente la tienda <span
                                    className="font-bold underline cursor-pointer hover:text-amber-900 transition-colors"
                                    title="Haz clic para copiar el nombre"
                                    onClick={() => setConfirmName(tenant.name)}
                                >{tenant.name}</span>, incluyendo:
                            </p>
                            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                {['Categorías', 'Productos', 'Pedidos', 'Configuración'].map((item) => (
                                    <li key={item} className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5">
                                        <div className="w-1 h-1 bg-amber-400 rounded-full" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-[9px] text-amber-500 mt-2 italic">* Haz clic en el nombre subrayado para auto-completar.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-rose-600 text-xs font-bold animate-shake">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Double Security Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Para confirmar, escribe el nombre de la tienda:
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    disabled={isDeleting}
                                    className={`w-full bg-slate-50 border-2 rounded-xl px-4 py-3 font-bold text-slate-900 transition-all outline-none ${isConfirmed
                                        ? 'border-emerald-500 bg-emerald-50/30'
                                        : confirmName.length > 0 ? 'border-amber-200' : 'border-transparent focus:border-indigo-100'
                                        }`}
                                    placeholder={tenant.name}
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                />
                                {isConfirmed && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDelete}
                            disabled={!isConfirmed || isDeleting}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shadow-xl ${isConfirmed
                                ? 'bg-rose-600 text-white shadow-rose-100 hover:bg-rose-700 active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {isDeleting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Destruyendo Base de Datos...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    ELIMINAR DEFINITIVAMENTE
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors disabled:opacity-0"
                        >
                            Cancelar Operación
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}} />
        </div>
    )
}
