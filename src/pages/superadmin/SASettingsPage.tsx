import { useState, useEffect } from 'react'
import { Settings, Shield, CreditCard, RefreshCw, Save, AlertCircle, Plus, X, Send, Bell, CheckCircle } from 'lucide-react'
import { superadminApi } from '../../services/api'
import { toast } from 'sonner'
import type { PaymentGateway } from '../../types'

export default function SASettingsPage() {
    const [settings, setSettings] = useState({
        maintenance_mode: false,
        allow_registrations: true,
        master_approval: false,
        email_notifications: true,
        global_announcement_active: false,
        global_announcement_text: '',
        telegram_notifications_enabled: false,
        telegram_notify_payments: true,
        telegram_notify_subscriptions: true,
        telegram_notify_new_stores: true,
    })
    const [telegramCredentials, setTelegramCredentials] = useState({ bot_token: '', chat_id: '' })
    const [testingTelegram, setTestingTelegram] = useState(false)
    const [gateways, setGateways] = useState<PaymentGateway[]>([])
    const [showModal, setShowModal] = useState(false)
    const [newGateway, setNewGateway] = useState({ provider: 'stripe', public_key: '', secret_key: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        superadminApi.listGateways(true).then(setGateways).catch(console.error)
        superadminApi.getGlobalSettings().then(res => {
            const raw = res as Record<string, unknown>
            setSettings(s => ({ ...s, ...raw }))
            setTelegramCredentials({
                bot_token: String(raw.telegram_bot_token ?? ''),
                chat_id: String(raw.telegram_chat_id ?? ''),
            })
        }).catch(console.error)
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            await superadminApi.updateGlobalSettings({
                ...settings,
                telegram_bot_token: telegramCredentials.bot_token,
                telegram_chat_id: telegramCredentials.chat_id,
            })
            toast.success('Configuración global actualizada con éxito.')
        } finally {
            setSaving(false)
        }
    }

    const handleTestTelegram = async () => {
        if (!telegramCredentials.bot_token || !telegramCredentials.chat_id) {
            toast.error('Ingresa el Bot Token y el Chat ID antes de probar.')
            return
        }
        setTestingTelegram(true)
        try {
            const res = await fetch('/api/test-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_token: telegramCredentials.bot_token, chat_id: telegramCredentials.chat_id }),
            })
            const data = await res.json() as { ok: boolean; description?: string }
            if (data.ok) {
                toast.success('✅ Mensaje de prueba enviado exitosamente.')
            } else {
                toast.error('Error al enviar el mensaje de prueba', { description: data.description })
            }
        } catch {
            toast.error('No se pudo conectar con el servidor.')
        } finally {
            setTestingTelegram(false)
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
            toast.success('Pasarela conectada con éxito.')
        } catch (err: unknown) {
            console.error('Error connecting gateway:', err)
            toast.error('Error al conectar la pasarela', {
                description: err instanceof Error ? err.message : 'Error desconocido'
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración Global</h2>
                    <p className="text-slate-500 mt-1">Controla los parámetros maestros de toda la red VENDExChat.</p>
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

                {/* Global Announcement Section */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-indigo-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Anuncio Global VENDEx</h3>
                        </div>
                        <button
                            onClick={() => setSettings(s => ({ ...s, global_announcement_active: !s.global_announcement_active }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.global_announcement_active ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.global_announcement_active ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    <div className="p-8 space-y-4">
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Este mensaje aparecerá en la parte superior de TODAS las tiendas activas en la red. Úsalo para mantenimientos, promociones globales o avisos importantes.</p>
                        <textarea
                            value={settings.global_announcement_text || ''}
                            onChange={(e) => setSettings(s => ({ ...s, global_announcement_text: e.target.value }))}
                            className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                            placeholder="Escribe el mensaje del anuncio aquí..."
                        />
                    </div>
                </div>
            </div>

            {/* Telegram Notifications */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-sky-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-100 rounded-xl text-sky-600">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Notificaciones Telegram</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Recibe alertas en tiempo real de pagos, suscripciones y nuevas tiendas.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSettings(s => ({ ...s, telegram_notifications_enabled: !s.telegram_notifications_enabled }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.telegram_notifications_enabled ? 'bg-sky-500' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.telegram_notifications_enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    {/* Credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Bot Token</label>
                            <input
                                type="password"
                                placeholder="123456789:AABBccDD..."
                                value={telegramCredentials.bot_token}
                                onChange={(e) => setTelegramCredentials(c => ({ ...c, bot_token: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-300"
                            />
                            <p className="mt-1.5 text-[10px] text-slate-400">Obtén el token de <strong>@BotFather</strong> en Telegram.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Chat ID</label>
                            <input
                                type="text"
                                placeholder="-1001234567890"
                                value={telegramCredentials.chat_id}
                                onChange={(e) => setTelegramCredentials(c => ({ ...c, chat_id: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-300"
                            />
                            <p className="mt-1.5 text-[10px] text-slate-400">Puede ser tu chat personal o un grupo/canal.</p>
                        </div>
                    </div>

                    {/* Notification toggles */}
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Eventos a notificar</p>
                        {[
                            { id: 'telegram_notify_payments', label: 'Pagos', desc: 'Cobros exitosos y pagos fallidos de suscripciones.', icon: CreditCard },
                            { id: 'telegram_notify_subscriptions', label: 'Suscripciones', desc: 'Activaciones, cancelaciones y cambios de estado.', icon: Bell },
                            { id: 'telegram_notify_new_stores', label: 'Nuevas tiendas', desc: 'Registros de nuevos comercios en la plataforma.', icon: CheckCircle },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{item.label}</p>
                                        <p className="text-xs text-slate-400">{item.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettings(s => ({ ...s, [item.id]: !s[item.id as keyof typeof s] }))}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${settings[item.id as keyof typeof settings] ? 'bg-sky-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings[item.id as keyof typeof settings] ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Test button */}
                    <button
                        onClick={handleTestTelegram}
                        disabled={testingTelegram || !telegramCredentials.bot_token || !telegramCredentials.chat_id}
                        className="flex items-center gap-2 px-6 py-3 bg-sky-50 border border-sky-200 text-sky-700 font-bold text-sm rounded-xl hover:bg-sky-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {testingTelegram ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar mensaje de prueba
                    </button>
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

            {/* Gateways List */}
            {gateways.length > 0 && (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="p-8 border-b border-slate-50">
                        <h3 className="font-bold text-lg text-slate-900">Pasarelas de Pago Activas</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {gateways.map((gw) => (
                            <div key={gw.id} className="p-8 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-600 transition-colors">
                                        <CreditCard className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase tracking-widest">{gw.provider}</p>
                                        <p className="text-xs text-slate-400 mt-1">Conectado el {new Date(gw.created_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                    Operativo
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                    {newGateway.provider === 'mercadopago' ? 'Public Key' :
                                        newGateway.provider === 'paypal' ? 'Client ID' : 'Public Key'}
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder={
                                        newGateway.provider === 'mercadopago' ? 'APP_USR-...' :
                                            newGateway.provider === 'paypal' ? 'ASid...' : 'pk_test_...'
                                    }
                                    value={newGateway.public_key}
                                    onChange={(e) => setNewGateway(n => ({ ...n, public_key: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                    {newGateway.provider === 'mercadopago' ? 'Access Token' :
                                        newGateway.provider === 'paypal' ? 'Client Secret' : 'Secret Key'}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                    placeholder={
                                        newGateway.provider === 'mercadopago' ? 'APP_USR-...' :
                                            newGateway.provider === 'paypal' ? 'E...' : 'sk_test_...'
                                    }
                                    value={newGateway.secret_key}
                                    onChange={(e) => setNewGateway(n => ({ ...n, secret_key: e.target.value }))}
                                />
                                {newGateway.provider === 'mercadopago' && (
                                    <p className="mt-2 text-[10px] text-slate-400 leading-tight">
                                        En MercadoPago, estas credenciales se encuentran en <br />
                                        <strong>Panel de Desarrollador {'>'} Credenciales de Producción</strong>
                                    </p>
                                )}
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
