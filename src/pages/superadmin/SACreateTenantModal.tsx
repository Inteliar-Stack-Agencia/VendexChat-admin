import { useState } from 'react'
import { X, RefreshCw, Send } from 'lucide-react'

interface SACreateTenantModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: { name: string; slug: string; email: string; country: string; plan_type: string }) => Promise<void>
    isSaving: boolean
}

export default function SACreateTenantModal({ isOpen, onClose, onConfirm, isSaving }: SACreateTenantModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        email: '',
        country: 'Argentina',
        plan_type: 'free'
    })

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!formData.name || !formData.slug || !formData.email) return
        await onConfirm(formData)
        setFormData({ name: '', slug: '', email: '', country: 'Argentina', plan_type: 'free' })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col scale-100 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Nueva Tienda Manual</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Negocio</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                            placeholder="Ej: Tienda de Pepe"
                            value={formData.name}
                            onChange={(e) => setFormData(t => ({ ...t, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Slug (URL)</label>
                        <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-4 py-3">
                            <span className="text-slate-400 font-bold">/</span>
                            <input
                                type="text"
                                className="flex-1 bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0 outline-none"
                                placeholder="tienda-de-pepe"
                                value={formData.slug}
                                onChange={(e) => setFormData(t => ({ ...t, slug: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email del Propietario</label>
                        <input
                            type="email"
                            className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                            placeholder="pepe@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData(t => ({ ...t, email: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">País</label>
                        <select
                            className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                            value={formData.country}
                            onChange={(e) => setFormData(t => ({ ...t, country: e.target.value }))}
                        >
                            <option value="Argentina">🇦🇷 Argentina</option>
                            <option value="Chile">🇨🇱 Chile</option>
                            <option value="Uruguay">🇺🇾 Uruguay</option>
                            <option value="México">🇲🇽 México</option>
                            <option value="Colombia">🇨🇴 Colombia</option>
                            <option value="España">🇪🇸 España</option>
                            <option value="Otros">Otro / Internacional</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan de Suscripción</label>
                        <select
                            className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none uppercase"
                            value={formData.plan_type}
                            onChange={(e) => setFormData(t => ({ ...t, plan_type: e.target.value }))}
                        >
                            <option value="free">FREE</option>
                            <option value="pro">PRO (Trial 15d)</option>
                            <option value="vip">VIP</option>
                            <option value="ultra">ULTRA (Bespoke)</option>
                        </select>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
                        </div>
                        <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                            <strong className="block uppercase tracking-widest mb-0.5">Flujo de Acceso:</strong>
                            Al dar de alta la tienda, se enviará automáticamente un <strong>email de invitación</strong> al dueño para que cree su contraseña e ingrese al sistema.
                        </p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving || !formData.name || !formData.slug || !formData.email}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        Dar de Alta Tienda
                    </button>
                </div>
            </div>
        </div>
    )
}
