import { useState, useEffect } from 'react'
import { Settings, Shield, CreditCard, RefreshCw, Save, AlertCircle, Plus, X } from 'lucide-react'
import { superadminApi } from '../../services/api'

export default function SASettingsPage() {
    const [settings, setSettings] = useState({
        maintenance_mode: false,
        allow_registrations: true,
        master_approval: false,
        email_notifications: true
    })
    const [gateways, setGateways] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [newGateway, setNewGateway] = useState({ provider: 'stripe', public_key: '', secret_key: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        superadminApi.listGateways(true).then(setGateways).catch(console.error)
        superadminApi.getGlobalSettings().then(setSettings).catch(console.error)
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            await superadminApi.updateGlobalSettings(settings)
            alert('Configuración global actualizada con éxito.')
        } finally {
            setSaving(false)
        }
    }

    const handleConnect = async () => {
        setSaving(true)
        try {
            await superadminApi.connectGateway(newGateway.provider, {
                public_key: newGateway.public_key,
                secret_key: newGateway.secret_key
            }, true)
            setShowModal(false)
            setNewGateway({ provider: 'stripe', public_key: '', secret_key: '' })
            superadminApi.listGateways(true).then(setGateways)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración Global</h2>
                    <p className="text-slate-500 mt-1">Controla los parámetros maestros de toda la red VendexChat.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Cambios
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* General Settings */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-lg text-slate-900">Estado de la Red</h3>
                    </div>
                    <div className="p-8 space-y-6">
                        {[
                            { id: 'maintenance_mode', label: 'Modo Mantenimiento', desc: 'Desactiva el acceso a todas las tiendas para mantenimiento.', icon: AlertCircle },
                            { id: 'allow_registrations', label: 'Registros Abiertos', desc: 'Permite que nuevos usuarios creen sus propias tiendas.', icon: RefreshCw }
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="max-w-xs">
                                        <p className="text-sm font-bold text-slate-900">{item.label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettings(s => ({ ...s, [item.id]: !s[item.id as keyof typeof s] }))}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${settings[item.id as keyof typeof settings] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[item.id as keyof typeof settings] ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security & Access */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-violet-600" />
                        <h3 className="font-bold text-lg text-slate-900">Seguridad y Auditoría</h3>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div className="max-w-xs">
                                    <p className="text-sm font-bold text-slate-900">Aprobación Manual</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Las tiendas nuevas requieren validación del SaaS Owner.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings(s => ({ ...s, master_approval: !s.master_approval }))}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.master_approval ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.master_approval ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <button className="w-full border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">
                            Descargar Logs de Auditoría (CSV)
                        </button>
                    </div>
                </div>
            </div>

            {/* Billing Integration Integration */}
            <div className="bg-slate-900 rounded-[2rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold">Billing Gateway</h3>
                    </div>
                    <p className="text-slate-400 max-w-md leading-relaxed">
                        Conecta y gestiona las cuentas de recaudación global para las suscripciones del SaaS. Activos: <span className="text-white font-bold">{gateways.length}</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-white text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-slate-100 transition-colors shrink-0 relative z-10"
                >
                    Configurar Pasarelas Maestras
                </button>
                <CreditCard className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5" />
            </div>

            {/* Gateway Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col scale-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Conectar Pasarela</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Proveedor</label>
                                <select
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    value={newGateway.provider}
                                    onChange={(e) => setNewGateway(n => ({ ...n, provider: e.target.value }))}
                                >
                                    <option value="stripe">Stripe</option>
                                    <option value="mercadopago">MercadoPago</option>
                                    <option value="paypal">PayPal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Public Key / Client ID</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="pk_test_..."
                                    value={newGateway.public_key}
                                    onChange={(e) => setNewGateway(n => ({ ...n, public_key: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Secret Key / Client Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder="sk_test_..."
                                    value={newGateway.secret_key}
                                    onChange={(e) => setNewGateway(n => ({ ...n, secret_key: e.target.value }))}
                                />
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={saving}
                                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
                                Vincular Pasarela Maestra
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
