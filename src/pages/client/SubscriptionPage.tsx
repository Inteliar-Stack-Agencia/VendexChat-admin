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
            try {
                const [plansData, subData] = await Promise.all([
                    billingApi.getPlans(),
                    billingApi.getCurrentSubscription()
                ])
                setPlans(plansData)
                setCurrentSub(subData)
            } catch (err) {
                console.error('Error loading subscription data:', err)
                showToast('error', 'No se pudieron cargar los datos de suscripción')
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
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* ... (Header y Banner omitidos por brevedad, se mantienen igual) ... */}
            <header>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight text-center sm:text-left">Planes y Facturación</h2>
                <p className="text-slate-500 mt-1 text-center sm:text-left">Escala tu negocio con herramientas avanzadas y soporte dedicado.</p>
            </header>

            {/* Current Plan Banner */}
            {currentSub && (
                <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-100 mb-12">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Plan Actual</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl font-black uppercase tracking-tight">VENDEx {currentSub.plan_type}</h3>
                                    <Badge color="text-white" bg="bg-emerald-500" className="border border-emerald-400/50">Activo</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Próximo Cobro</p>
                                <p className="text-lg font-bold">{currentSub.current_period_end ? new Date(currentSub.current_period_end).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                                Gestionar Suscripción
                            </Button>
                        </div>
                    </div>
                    <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10" />
                </div>
            )}

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const isCurrent = currentSub?.plan_type === plan.id
                    const isPopular = plan.is_popular

                    return (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col p-8 transition-transform duration-300 hover:scale-[1.02] border-2 ${isPopular ? 'border-emerald-500 shadow-xl shadow-emerald-50' : 'border-slate-100'
                                }`}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-lg">
                                    Más Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${plan.id === 'premium' ? 'bg-amber-50 text-amber-600' :
                                    plan.id === 'pro' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-slate-50 text-slate-500'
                                    }`}>
                                    {plan.id === 'premium' ? <Crown className="w-6 h-6" /> :
                                        plan.id === 'pro' ? <Zap className="w-6 h-6" /> :
                                            <Shield className="w-6 h-6" />}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-900">${plan.price}</span>
                                    <span className="text-slate-400 text-sm font-bold">/ mes</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="mt-1 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                        </div>
                                        <span className="text-sm text-slate-600 font-medium leading-tight">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={isCurrent || isProcessing}
                                loading={isProcessing && selectedPlan?.id === plan.id}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 group transition-all ${isCurrent
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-0'
                                    : isPopular
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                            >
                                {isCurrent ? 'Tu Plan' : 'Suscribirse'}
                                {!isCurrent && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                            </Button>
                        </Card>
                    )
                })}
            </div>

            {/* billing history */}
            <div className="mt-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                        Historial de Pagos
                    </h3>
                    <button className="text-emerald-600 text-sm font-bold hover:underline">Descargar todo (.zip)</button>
                </div>
                <div className="p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-8 py-4">Fecha</th>
                                <th className="px-8 py-4">Descripción</th>
                                <th className="px-8 py-4">Monto</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4 text-right">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { date: '2024-02-01', desc: 'Suscripción VENDEx Pro - Febrero', amount: '$15.00', status: 'paid' },
                                { date: '2024-01-01', desc: 'Suscripción VENDEx Pro - Enero', amount: '$15.00', status: 'paid' },
                            ].map((invoice, i) => (
                                <tr key={i} className="text-sm font-medium text-slate-600 group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-slate-900 font-bold">{new Date(invoice.date).toLocaleDateString()}</td>
                                    <td className="px-8 py-5">{invoice.desc}</td>
                                    <td className="px-8 py-5 text-slate-900 font-bold">{invoice.amount}</td>
                                    <td className="px-8 py-5">
                                        <Badge bg="bg-emerald-50" color="text-emerald-600" className="border border-emerald-100">Pagado</Badge>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100">
                                            <CreditCard className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50 rounded-[2rem] p-8 flex items-start gap-4 border border-amber-100 mb-10">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                    <h4 className="font-bold text-amber-900 uppercase text-xs tracking-widest mb-1">Nota sobre pagos seguros</h4>
                    <p className="text-amber-800 text-sm leading-relaxed">
                        Utilizamos Mercado Pago para procesar todos tus pagos de forma segura. Tus datos están protegidos y nunca almacenamos información sensible de tarjetas en nuestros servidores.
                    </p>
                </div>
            </div>

            {/* Real Checkout Modal with Mercado Pago Brick */}
            <Modal
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                title="Pagar Suscripción VENDEx"
            >
                {selectedPlan && (
                    <MPPaymentBrick
                        plan={selectedPlan}
                        storeId={useAuth().user?.store_id || ''}
                        onSuccess={handlePaymentSuccess}
                        onCancel={() => setShowCheckoutModal(false)}
                    />
                )}
            </Modal>
        </div>
    )
}
