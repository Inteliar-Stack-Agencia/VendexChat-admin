import { useState, useEffect } from 'react'
import {
    Check,
    Zap,
    Shield,
    Crown,
    CreditCard,
    Clock,
    AlertCircle,
    ArrowRight
} from 'lucide-react'
import { Card, Button, Badge, LoadingSpinner, showToast, Modal } from '../../components/common'
import { billingApi } from '../../services/api'
import { Subscription, SubscriptionPlan } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

import MPPaymentBrick from '../../components/billing/MPPaymentBrick'

export default function SubscriptionPage() {
    const { refreshSubscription } = useAuth()
    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [currentSub, setCurrentSub] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            // Cargar planes (Independiente)
            try {
                const plansData = await billingApi.getPlans()
                setPlans(plansData)
            } catch (err) {
                console.error('Error loading plans:', err)
                showToast('error', 'No se pudieron cargar los planes disponibles')
            }

            // Cargar suscripción actual (Independiente)
            try {
                const subData = await billingApi.getCurrentSubscription()
                setCurrentSub(subData)
            } catch (err) {
                console.error('Error loading current subscription:', err)
                // No mostramos toast aquí porque ya devolvemos un estado por defecto en el API, 
                // pero por si acaso falla a nivel de red.
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const handleSubscribe = async (planId: string) => {
        const plan = plans.find(p => p.id === planId)
        if (!plan) return

        setSelectedPlan(plan)
        setShowCheckoutModal(true)
    }

    const handlePaymentSuccess = async (paymentId: string) => {
        console.log('Payment Success ID:', paymentId)
        setIsProcessing(true)
        try {
            // Refrescamos datos locales tras el pago exitoso confirmado por el Brick
            await refreshSubscription()
            const subData = await billingApi.getCurrentSubscription()
            setCurrentSub(subData)
            setShowCheckoutModal(false)
            showToast('success', '¡Suscripción activada con éxito!')
        } catch (err) {
            showToast('error', 'Pago recibido, pero hubo un error al actualizar tu perfil. Contacta a soporte.')
        } finally {
            setIsProcessing(false)
        }
    }

    if (loading) return <LoadingSpinner text="Consultando estado de tu plan..." />

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Planes y Facturación</h2>
                    <p className="text-slate-500 font-medium mt-1">Escala tu negocio con herramientas avanzadas y soporte dedicado.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-white border-slate-200">
                        Configurar Facturación
                    </Button>
                </div>
            </header>

            {/* Current Plan Banner */}
            {currentSub && (
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Zap className="w-8 h-8 text-white fill-current" />
                            </div>
                            <div>
                                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Plan Actual</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">VENDEx {currentSub.plan_type}</h3>
                                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black uppercase text-emerald-400">Activo</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right hidden sm:block">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Próximo Cobro</p>
                                <p className="text-lg font-bold">{currentSub.current_period_end ? new Date(currentSub.current_period_end).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <Button variant="secondary" className="bg-white text-slate-900 border-0 font-black uppercase text-[10px] tracking-widest px-6">
                                Gestionar Suscripción
                            </Button>
                        </div>
                    </div>
                    <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-white/[0.03]" />
                </div>
            )}

            {/* Pricing / Upgrade Options */}
            <div>
                <div className="flex items-center gap-3 mb-8 px-1">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Opciones de Mejora</span>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                {(plans.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const isCurrent = currentSub?.plan_type === plan.id
                            const isPopular = plan.is_popular

                            return (
                                <Card
                                    key={plan.id}
                                    className={`group relative flex flex-col p-8 transition-all duration-500 hover:-translate-y-2 border-2 ${isPopular ? 'border-indigo-500 shadow-2xl shadow-indigo-50' : 'border-slate-50'
                                        }`}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest shadow-xl shadow-indigo-200">
                                            Más Popular
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${plan.id === 'premium' ? 'bg-amber-50 text-amber-500 shadow-lg shadow-amber-100' :
                                            plan.id === 'pro' ? 'bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100' :
                                                'bg-slate-50 text-slate-400 shadow-lg shadow-slate-100'
                                            }`}>
                                            {plan.id === 'premium' ? <Crown className="w-7 h-7" /> :
                                                plan.id === 'pro' ? <Zap className="w-7 h-7" /> :
                                                    <Shield className="w-7 h-7" />}
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-slate-900 tracking-tighter">${plan.price}</span>
                                            <span className="text-slate-400 text-sm font-bold">/ mes</span>
                                        </div>
                                        <p className="text-slate-400 text-xs font-medium mt-2">Para negocios que buscan {plan.id === 'premium' ? 'exclusividad' : plan.id === 'pro' ? 'crecimiento' : 'empezar'}.</p>
                                    </div>

                                    <div className="space-y-4 mb-10 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="mt-1 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <span className="text-sm text-slate-600 font-bold leading-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => handleSubscribe(plan.id)}
                                            disabled={isCurrent || isProcessing}
                                            loading={isProcessing && selectedPlan?.id === plan.id}
                                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 group/btn transition-all ${isCurrent
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-0'
                                                : isPopular
                                                    ? 'bg-indigo-600 text-white hover:bg-slate-900 shadow-xl shadow-indigo-100 hover:shadow-indigo-200'
                                                    : 'bg-white text-slate-900 border-2 border-slate-100 hover:border-slate-900'
                                                }`}
                                        >
                                            {isCurrent ? 'Tu Plan Actual' : 'Suscribirse Ahora'}
                                            {!isCurrent && <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />}
                                        </Button>

                                        {!isCurrent && (
                                            <a
                                                href={`https://wa.me/5491100000000?text=Hola! Quiero subir al plan ${plan.name} para mi tienda.`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block text-center text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors py-2"
                                            >
                                                O pagar con link directo
                                            </a>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* billing history */}
            <div className="mt-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                    <div>
                        <h3 className="font-black text-lg text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Historial de Pagos
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Gestiona tus facturas y comprobantes anteriores.</p>
                    </div>
                    <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm">
                        Descargar todo (.zip)
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Descripción</th>
                                <th className="px-8 py-5">Monto</th>
                                <th className="px-8 py-5">Estado</th>
                                <th className="px-8 py-5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { date: '2024-02-01', desc: 'Suscripción VENDEx Pro - Febrero', amount: '$15.00', status: 'paid' },
                                { date: '2024-01-01', desc: 'Suscripción VENDEx Pro - Enero', amount: '$15.00', status: 'paid' },
                            ].map((invoice, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-900">{new Date(invoice.date).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-medium text-slate-600">{invoice.desc}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-900">{invoice.amount}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase text-emerald-600">Pagado</div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm">
                                            <CreditCard className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-indigo-950 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shrink-0">
                    <Shield className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                    <h4 className="font-black text-white uppercase text-xs tracking-widest mb-2 opacity-50">Garantía VENDEx</h4>
                    <h3 className="text-xl font-bold text-white mb-2">Tus pagos están 100% protegidos</h3>
                    <p className="text-indigo-200/60 text-sm leading-relaxed max-w-2xl">
                        Utilizamos Mercado Pago para procesar todos tus pagos de forma segura. Tus datos están cifrados y nunca almacenamos información sensible de tarjetas en nuestros servidores.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
            </div>

            {/* Real Checkout Modal with Mercado Pago Brick */}
            <Modal
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                title="Pagar Suscripción VENDEx"
            >
                {selectedPlan && (
                    <div className="p-4 sm:p-6 space-y-6">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Seleccionado</p>
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-xl text-slate-900 uppercase tracking-tight">{selectedPlan.name}</h4>
                                <span className="text-xl font-black text-indigo-600">${selectedPlan.price} <span className="text-xs text-slate-400">/ mes</span></span>
                            </div>
                        </div>

                        <MPPaymentBrick
                            plan={selectedPlan}
                            storeId={useAuth().user?.store_id || ''}
                            onSuccess={handlePaymentSuccess}
                            onCancel={() => setShowCheckoutModal(false)}
                        />

                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-tight">O contactar a un asesor</p>
                            <a href={`https://wa.me/5491100000000?text=Ayuda con el pago del plan ${selectedPlan.name}`} className="text-indigo-600 font-black text-xs uppercase hover:underline">Chat de WhatsApp</a>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
