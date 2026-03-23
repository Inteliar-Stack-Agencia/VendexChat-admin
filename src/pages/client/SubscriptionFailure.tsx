import { useNavigate, useSearchParams } from 'react-router-dom'
import { XCircle, RotateCcw } from 'lucide-react'

export default function SubscriptionFailure() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const paymentId = params.get('payment_id')

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-12 h-12 text-rose-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Pago rechazado
                    </h2>
                    <p className="text-slate-500 font-medium">
                        No se pudo procesar tu pago. Esto puede deberse a fondos insuficientes, datos incorrectos o una restricción del banco.
                    </p>
                </div>

                {paymentId && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia</p>
                        <p className="text-sm font-mono text-slate-600">ID: {paymentId}</p>
                    </div>
                )}

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left space-y-1">
                    <p className="text-xs font-black text-amber-700 uppercase tracking-widest">¿Qué podés hacer?</p>
                    <ul className="text-xs text-amber-800 space-y-1 font-medium list-disc list-inside">
                        <li>Verificar que los datos de la tarjeta sean correctos</li>
                        <li>Asegurarte de tener saldo disponible</li>
                        <li>Intentar con otro método de pago</li>
                        <li>Contactar a tu banco si el problema persiste</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => navigate('/subscription')}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100"
                    >
                        <RotateCcw className="w-4 h-4" /> Intentar de nuevo
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                    >
                        Volver al Dashboard
                    </button>
                </div>
            </div>
        </div>
    )
}
