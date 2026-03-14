import { useState, useEffect } from 'react'
import {
    Check,
    Zap,
    Shield,
    Crown,
    ArrowRight,
    MessageCircle
} from 'lucide-react'
import { Card, Button, Badge, LoadingSpinner, showToast, Modal } from '../../components/common'
import { billingApi, tenantApi } from '../../services/api'
import { Subscription, SubscriptionPlan } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

import MPPaymentBrick from '../../components/billing/MPPaymentBrick'

// Países donde Mercado Pago está disponible
const MP_COUNTRIES = ['Argentina', 'Uruguay', 'Chile', 'México', 'Colombia', 'Perú', 'Ecuador', 'Paraguay', 'Bolivia']


const ROI_MESSAGES: Record<string, string> = {
    free: 'Ideal para validar tu idea y captar tus primeros pedidos sin costo.',
    pro: 'Ahorra tiempo operativo y aumenta conversión con IA y automatización comercial.',
    vip: 'Reduce tareas manuales, acelera entregas y mejora recompra con CRM + logística + bot IA.',
    ultra: 'Escala con soporte dedicado e implementación estratégica a medida.'
}

const VIP_DIFFERENTIATORS = [
    'Seguimiento postventa y reactivación de clientes desde CRM IA.',
    'Operación más ágil: bot + logística + soporte prioritario en un solo plan.'
]

export default function SubscriptionPage() {
    const { refreshSubscription, user } = useAuth()
    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [currentSub, setCurrentSub] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
    const [userCountry, setUserCountry] = useState<string | null>(null)

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
                if (subData?.billing_cycle) {
                    setBillingCycle(subData.billing_cycle)
                }
            } catch (err) {
                console.error('Error loading current subscription:', err)
                // No mostramos toast aquí porque ya devolvemos un estado por defecto en el API, 
                // pero por si acaso falla a nivel de red.
            } finally {
                setLoading(false)
            }
        }
        // Cargar país de la tienda
        tenantApi.getMe().then(store => {
            setUserCountry(store.country)
        }).catch(err => {
            console.error('Error loading store country:', err)
        })

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
                                    <div className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${currentSub.status === 'active'
                                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                        : currentSub.status === 'trial'
                                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                                            : 'bg-slate-500/20 border-slate-500/30 text-slate-400'
                                        }`}>
                                        {currentSub.status === 'active'
                                            ? `Activo (${currentSub.billing_cycle === 'annual' ? 'Anual' : 'Mensual'})`
                                            : currentSub.status === 'trial'
                                                ? `Prueba PRO (${Math.max(0, Math.ceil((new Date(currentSub.current_period_end!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} días)`
                                                : currentSub.status}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right hidden sm:block">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    {currentSub.status === 'trial' ? 'Vence el' : 'Próximo Cobro'}
                                </p>
                                <p className="text-lg font-bold">
                                    {currentSub.current_period_end ? new Date(currentSub.current_period_end).toLocaleDateString() : 'N/A'}
                                </p>
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
                <div className="flex flex-col items-center mb-12">
                    <div className="flex items-center gap-3 mb-8 px-1 w-full">
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Opciones de Mejora</span>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Anual
                            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                                -15%
                            </span>
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-emerald-700 font-semibold">
                        Plan anual recomendado: ahorrás hasta 2 meses por año frente al pago mensual.
                    </p>
                </div>

                {(plans.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = currentSub?.plan_type === plan.id && (currentSub?.billing_cycle === billingCycle || (plan.id === 'free'))
                            const isPopular = plan.is_popular
                            const monthlyEquivalent = plan.id === 'ultra' ? 0 : Number((plan.annual_price / 12).toFixed(2))
                            const annualSavings = plan.id === 'free' || plan.id === 'ultra' ? 0 : Number(((plan.price * 12) - plan.annual_price).toFixed(2))

                            // Configuración de estilos por plan
                            const planStyles: Record<string, any> = {
                                free: {
                                    icon: <Shield className="w-7 h-7" />,
                                    bg: 'bg-slate-50 text-slate-400',
                                    border: 'border-slate-50',
                                    shadow: 'shadow-slate-100'
                                },
                                advance: {
                                    icon: <Zap className="w-7 h-7" />,
                                    bg: 'bg-emerald-50 text-emerald-600',
                                    border: 'border-emerald-100',
                                    shadow: 'shadow-emerald-100'
                                },
                                pro: {
                                    icon: <Zap className="w-7 h-7" />,
                                    bg: 'bg-indigo-50 text-indigo-600',
                                    border: 'border-indigo-500',
                                    shadow: 'shadow-indigo-100'
                                },
                                vip: {
                                    icon: <Crown className="w-7 h-7" />,
                                    bg: 'bg-amber-50 text-amber-500',
                                    border: 'border-amber-400',
                                    shadow: 'shadow-amber-100'
                                },
                                ultra: {
                                    icon: <Zap className="w-7 h-7" />,
                                    bg: 'bg-purple-50 text-purple-600',
                                    border: 'border-purple-500',
                                    shadow: 'shadow-purple-100'
                                }
                            }

                            const style = planStyles[plan.id] || planStyles.free

                            return (
                                <Card
                                    key={plan.id}
                                    className={`group relative flex flex-col p-6 transition-all duration-500 hover:-translate-y-2 border-2 ${isPopular ? style.border + ' shadow-2xl ' + style.shadow : 'border-slate-50'
                                        }`}
                                >
                                    {isPopular && (
                                        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest shadow-xl ${plan.id === 'pro' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-amber-600 shadow-amber-200'}`}>
                                            Recomendado
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${style.bg} ${style.shadow} shadow-lg`}>
                                            {style.icon}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>
                                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{plan.description}</p>
                                        <div className="mt-2 flex items-baseline gap-1">
                                            {plan.id !== 'free' && plan.id !== 'ultra' && (
                                                <span className="text-slate-400 text-xs font-bold">USD</span>
                                            )}
                                            <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                                {plan.id === 'ultra' ? 'Custom' : `$${billingCycle === 'monthly' ? plan.price : (plan.annual_price / 12).toFixed(2)}`}
                                            </span>
                                            {plan.id !== 'ultra' && <span className="text-slate-400 text-xs font-bold">/ mes</span>}
                                        </div>
                                        {billingCycle === 'annual' && plan.annual_price > 0 && (
                                            <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
                                                    Facturado anualmente (${plan.annual_price})
                                                </p>
                                                <p className="text-[11px] font-semibold text-emerald-700">
                                                    Equivale a USD ${monthlyEquivalent.toFixed(2)}/mes · Ahorrás USD ${annualSavings.toFixed(2)} al año.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                        <p className="text-xs text-indigo-700 font-semibold">
                                            {ROI_MESSAGES[plan.id] || 'Automatizá tareas y mejorá tu eficiencia operativa.'}
                                        </p>
                                    </div>

                                    {plan.id === 'vip' && (
                                        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Diferencial VIP</p>
                                            <ul className="mt-1 space-y-1">
                                                {VIP_DIFFERENTIATORS.map((item) => (
                                                    <li key={item} className="text-xs text-amber-700 font-semibold">• {item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="space-y-4 mb-8 flex-1">
                                        {plan.features.map((feature, i) => {
                                            const isIAFeature = feature.toLowerCase().includes('asistente de ventas ia') || feature.toLowerCase().includes('importador masivo con ia')
                                            return (
                                                <div key={i} className={`flex items-start gap-3 ${isIAFeature ? 'p-2 rounded-xl bg-violet-50 border border-violet-100' : ''}`}>
                                                    <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isIAFeature ? 'bg-violet-100 border-violet-200' : 'bg-emerald-50 border-emerald-100'}`}>
                                                        <Check className={`w-3 h-3 ${isIAFeature ? 'text-violet-700' : 'text-emerald-600'}`} />
                                                    </div>
                                                    <span className={`text-[11px] font-bold leading-tight ${isIAFeature ? 'text-violet-800' : 'text-slate-600'}`}>{feature}</span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                if (plan.id === 'ultra') {
                                                    window.open(`https://wa.me/5491165689145?text=Hola! Quiero info sobre el plan VENDEx ULTRA`, '_blank')
                                                } else {
                                                    handleSubscribe(plan.id)
                                                }
                                            }}
                                            disabled={isCurrent || isProcessing}
                                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 group/btn transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isCurrent
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : isPopular
                                                    ? 'bg-indigo-600 text-white hover:bg-slate-900 shadow-xl shadow-indigo-100 hover:shadow-indigo-200'
                                                    : plan.id === 'vip'
                                                        ? 'bg-amber-500 text-white hover:bg-slate-900 shadow-xl shadow-amber-100 hover:shadow-amber-200'
                                                        : plan.id === 'ultra'
                                                            ? 'bg-purple-600 text-white hover:bg-slate-900 shadow-xl shadow-purple-100 hover:shadow-purple-200'
                                                            : 'bg-slate-100 text-slate-500 border-2 border-slate-200 hover:border-slate-900 hover:text-slate-900'
                                                }`}
                                        >
                                            {isProcessing && selectedPlan?.id === plan.id
                                                ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                                : null
                                            }
                                            {isCurrent ? 'Tu Plan Actual' : plan.id === 'ultra' ? 'Contactar' : 'Suscribirse'}
                                            {!isCurrent && <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />}
                                        </button>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>



            {/* Real Checkout Modal — flujo según país */}
            <Modal
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                title="Pagar Suscripción VENDEx"
            >
                {selectedPlan && (() => {
                    const amount = billingCycle === 'annual' ? selectedPlan.annual_price : selectedPlan.price
                    const isMPAvailable = MP_COUNTRIES.includes(userCountry || '')

                    return (
                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Plan Summary */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Seleccionado</p>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-xl text-slate-900 uppercase tracking-tight">{selectedPlan.name}</h4>
                                    <div className="text-right">
                                        <span className="text-xl font-black text-indigo-600">${amount}</span>
                                        <span className="text-xs text-slate-400 block uppercase font-bold tracking-tighter">
                                            / {billingCycle === 'monthly' ? 'mes' : 'año'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isMPAvailable ? (
                                /* Flujo Mercado Pago para países LATAM */
                                <MPPaymentBrick
                                    plan={selectedPlan}
                                    billingCycle={billingCycle}
                                    storeId={user?.store_id || ''}
                                    onSuccess={handlePaymentSuccess}
                                    onCancel={() => setShowCheckoutModal(false)}
                                />
                            ) : (
                                /* Flujo manual para otros países */
                                <div className="space-y-4">
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
                                        <MessageCircle className="w-10 h-10 text-amber-500 mx-auto" />
                                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Activación Manual</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Para tu país (<span className="font-bold text-slate-700">{userCountry || 'desconocido'}</span>), el pago se coordina con un asesor. Tocá el botón y te activamos el plan en minutos.
                                        </p>
                                    </div>

                                    <a
                                        href={`https://wa.me/5491165689145?text=${encodeURIComponent(`Hola! Quiero activar el plan VENDEx ${selectedPlan.name} (${billingCycle === 'monthly' ? 'Mensual' : 'Anual'}) - USD $${amount}. Email: ${user?.email || ''}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-100"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        Activar por WhatsApp
                                    </a>

                                    <button
                                        onClick={() => setShowCheckoutModal(false)}
                                        className="w-full text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors py-2"
                                    >
                                        Cancelar y volver
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })()}
            </Modal>
        </div>
    )
}
