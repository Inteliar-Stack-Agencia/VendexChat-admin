import { useState } from 'react'
import { CreditCard, CheckCircle, RefreshCw } from 'lucide-react'

interface TenantPaymentGatewaysProps {
    gateways: any[]
    onConnect: (provider: string, config: any) => Promise<boolean>
    onDisconnect: (id: string | number) => Promise<boolean>
    isSaving: boolean
}

export default function TenantPaymentGateways({ gateways, onConnect, onDisconnect, isSaving }: TenantPaymentGatewaysProps) {
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ provider: 'mercadopago', public_key: '', secret_key: '' })

    const handleConnect = async () => {
        const success = await onConnect(form.provider, {
            public_key: form.public_key,
            secret_key: form.secret_key
        })
        if (success) {
            setShowForm(false)
            setForm({ provider: 'mercadopago', public_key: '', secret_key: '' })
        }
    }

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Pasarela de Pagos</h3>
                </div>
                {gateways.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Conectada
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100">
                        Sin Configurar
                    </span>
                )}
            </div>
            <div className="p-8 space-y-6">
                {gateways.map((gw) => (
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
                            onClick={() => confirm('¿Desconectar esta pasarela?') && onDisconnect(gw.id)}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest"
                        >
                            Desconectar
                        </button>
                    </div>
                ))}

                {showForm ? (
                    <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Proveedor</label>
                            <select
                                value={form.provider}
                                onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
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
                                value={form.public_key}
                                onChange={e => setForm(prev => ({ ...prev, public_key: e.target.value }))}
                                placeholder="PUBLIC_KEY..."
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Secret Key</label>
                            <input
                                type="password"
                                value={form.secret_key}
                                onChange={e => setForm(prev => ({ ...prev, secret_key: e.target.value }))}
                                placeholder="SECRET_KEY..."
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-xl">Cancelar</button>
                            <button
                                onClick={handleConnect}
                                disabled={isSaving || !form.public_key || !form.secret_key}
                                className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                                {isSaving ? 'Conectando...' : '+ Vincular Pasarela'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all"
                    >
                        + Conectar Pasarela de Pagos
                    </button>
                )}
            </div>
        </div>
    )
}
