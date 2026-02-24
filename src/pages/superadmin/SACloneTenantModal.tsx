import { useState } from 'react'
import { X, Copy, RefreshCw, Send, AlertCircle } from 'lucide-react'
import { Tenant } from '../../types'

interface SACloneTenantModalProps {
    sourceTenant: Tenant
    onClose: () => void
    onSuccess: (newTenantId: string) => void
    onClone: (data: { name: string; slug: string; email: string }) => Promise<any>
}

export default function SACloneTenantModal({ sourceTenant, onClose, onSuccess, onClone }: SACloneTenantModalProps) {
    const [name, setName] = useState(`${sourceTenant.name} - Copia`)
    const [slug, setSlug] = useState(`${sourceTenant.slug}-copia`)
    const [email, setEmail] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleClone = async () => {
        if (!name || !slug || !email) return
        setSaving(true)
        setError(null)
        try {
            const res = await onClone({
                name,
                slug: slug.toLowerCase().replace(/\s+/g, '-'),
                email
            })
            onSuccess(res.id)
        } catch (err: any) {
            console.error('Clone Error:', err)
            setError(err.message || 'Error al clonar la tienda. Verifique que el slug no esté en uso.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col scale-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 bg-indigo-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Copy className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Clonar Sistema</h3>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Desde: {sourceTenant.slug}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-rose-600 animate-shake">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Nueva Sede</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                placeholder="Ej: Morfi La Plata"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value)
                                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Slug (URL unico)</label>
                            <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-indigo-100 transition-all">
                                <span className="text-slate-400 font-bold">/</span>
                                <input
                                    type="text"
                                    className="flex-1 bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0 outline-none"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email del Nuevo Dueño / Encargado</label>
                            <input
                                type="email"
                                className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                placeholder="laplata@morfiviandas.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl space-y-3 border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿Qué se copiará?</h4>
                        <ul className="grid grid-cols-2 gap-2">
                            {[
                                'Todas las Categorías',
                                'Todos los Productos',
                                'Imágenes y Textos',
                                'Colores de Marca',
                                'Prompt de IA',
                                'Config. de Envío'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                    <div className="w-1 h-1 bg-indigo-400 rounded-full" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={handleClone}
                        disabled={saving || !name || !slug || !email}
                        className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        {saving ? 'Clonando Base de Datos...' : 'Iniciar Clonación'}
                    </button>
                </div>
            </div>
        </div>
    )
}
