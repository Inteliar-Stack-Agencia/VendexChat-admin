import { useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'

export default function SubscriptionPending() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const paymentId = params.get('payment_id')

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-12 h-12 text-amber-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Pago pendiente
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Tu pago está siendo procesado. Tu plan se activará automáticamente en cuanto se acredite el pago (generalmente en minutos, o hasta 72hs para transferencias bancarias).
                    </p>
                </div>

                {paymentId && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia de pago</p>
                        <p className="text-sm font-mono text-slate-600">ID: {paymentId}</p>
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left space-y-1">
                    <p className="text-xs font-black text-blue-700 uppercase tracking-widest">¿Qué pasa ahora?</p>
                    <ul className="text-xs text-blue-800 space-y-1 font-medium list-disc list-inside">
                        <li>Mercado Pago está verificando tu pago</li>
                        <li>Te notificaremos por email cuando se acredite</li>
                        <li>Tu plan se activa automáticamente al confirmarse</li>
                        <li>Podés seguir usando el plan gratuito mientras tanto</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100"
                    >
                        Ir al Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate('/subscription')}
                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                    >
                        Ver mi Suscripción
                    </button>
                </div>
            </div>
        </div>
    )
}
