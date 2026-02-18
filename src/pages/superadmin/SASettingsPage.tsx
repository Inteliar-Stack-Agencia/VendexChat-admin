import { Settings, Globe, CreditCard, Shield } from 'lucide-react'

export default function SASettingsPage() {
    return (
        <div className="max-w-4xl space-y-10">
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración Global</h2>
                <p className="text-slate-500 mt-1">Parámetros maestros del ecosistema VendexChat.</p>
            </header>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-lg text-slate-900">Pasarelas de Pago por País</h3>
                </div>
                <div className="p-8 space-y-8">
                    {[
                        { country: 'Argentina', providers: ['MercadoPago', 'Stripe'] },
                        { country: 'Uruguay', providers: ['MercadoPago', 'PayPal'] },
                        { country: 'Chile', providers: ['Stripe', 'MercadoPago'] },
                        { country: 'España', providers: ['Stripe', 'PayPal'] },
                    ].map((item) => (
                        <div key={item.country} className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-900">{item.country}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{item.providers.join(', ')}</p>
                            </div>
                            <button className="text-xs font-bold text-blue-600 hover:underline">Gestionar</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-lg text-slate-900">Mantenimiento y Auditoría</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-900">Modo Mantenimiento Global</p>
                            <p className="text-xs text-slate-400 mt-0.5">Desactiva el acceso a todos los administradores.</p>
                        </div>
                        <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                    </div>
                    <button className="w-full border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">
                        Descargar Logs de Auditoría (CSV)
                    </button>
                </div>
            </div>
        </div>
    )
}
