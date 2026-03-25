import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function SubscriptionSuccess() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const { refreshSubscription } = useAuth()

    const preapprovalId = params.get('preapproval_id')
    const paymentId = params.get('payment_id')
    const status = params.get('status')
    const comprobante = preapprovalId || paymentId

    useEffect(() => {
        // Refresh subscription data so the rest of the app reflects the new plan
        refreshSubscription().catch(console.error)
    }, [refreshSubscription])

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        ¡Suscripción activada!
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Tu suscripción fue registrada. Los cobros se realizarán automáticamente cada ciclo. Ya podés usar todas las funciones de tu nuevo plan.
                    </p>
                </div>

                {comprobante && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comprobante</p>
                        <p className="text-sm font-mono text-slate-600">ID: {comprobante}</p>
                        {status && <p className="text-sm text-emerald-600 font-bold capitalize">{status}</p>}
                    </div>
                )}

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
                        Ver mi Plan
                    </button>
                </div>
            </div>
        </div>
    )
}
