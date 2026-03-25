import { useState, useEffect } from 'react'
import {
    Check,
    Zap,
    Shield,
    Crown,
    ArrowRight,
    Loader2,
    TrendingUp,
} from 'lucide-react'
import { Card, Button, LoadingSpinner } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { billingApi, tenantApi } from '../../services/api'
import { Subscription, SubscriptionPlan } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

const ROI_MESSAGES: Record<string, string> = {
    free: 'Ideal para validar tu idea y captar tus primeros pedidos sin costo.',
    pro: 'Ahorrá tiempo operativo y aumentá conversión con IA y automatización comercial.',
    vip: 'Reducí tareas manuales, acelerá entregas y mejorá recompra con CRM + logística + bot IA.',
    ultra: 'Escalá con soporte dedicado e implementación estratégica a medida.'
}

const VIP_DIFFERENTIATORS = [
    'Seguimiento postventa y reactivación de clientes desde CRM IA.',
    'Operación más ágil: bot + logística + soporte prioritario en un solo plan.'
]

type PaymentMethod = 'mp' | 'paypal'

export default function SubscriptionPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [currentSub, setCurrentSub] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
    const [exchangeRate, setExchangeRate] = useState<number | null>(null)
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)
    // Payment method per plan card — default detected from country, switchable by user
    const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({})

    useEffect(() => {
        const loadData = async () => {
            try {
                const plansData = await billingApi.getPlans()
                setPlans(plansData)
            } catch {
                showToast('error', 'No se pudieron cargar los planes disponibles')
            }

            try {
                const subData = await billingApi.getCurrentSubscription()
                setCurrentSub(subData)
                if (subData?.billing_cycle) setBillingCycle(subData.billing_cycle)
            } catch { /* silent */ } finally {
                setLoading(false)
            }
        }

        fetch('/api/exchange-rate')
            .then(r => r.json())
            .then((d: { rate?: number }) => { if (d.rate) setExchangeRate(d.rate) })
            .catch(() => {})

        // Detect country to set default payment method, but user can always switch
        tenantApi.getMe()
            .then(store => {
                const MP_COUNTRIES = ['Argentina', 'Uruguay', 'Chile', 'México', 'Colombia', 'Perú', 'Ecuador', 'Paraguay', 'Bolivia']
                const defaultMethod: PaymentMethod = MP_COUNTRIES.includes(store.country || '') ? 'mp' : 'paypal'
                setPaymentMethods({ pro: defaultMethod, vip: defaultMethod, ultra: defaultMethod })
            })
            .catch(() => {
                setPaymentMethods({ pro: 'mp', vip: 'mp', ultra: 'mp' })
            })

        loadData()
    }, [])

    // Auto-start payment if redirected from login with plan params
    useEffect(() => {
        const autoPlan = searchParams.get('plan')
        const autoCycle = searchParams.get('cycle') as 'monthly' | 'annual' | null
        const autoStart = searchParams.get('autostart') === 'true'

        if (autoStart && autoPlan && user && plans.length > 0) {
            if (autoCycle) setBillingCycle(autoCycle)
            // Small delay to let state settle
            const timer = setTimeout(() => handleSubscribe(autoPlan), 500)
            return () => clearTimeout(timer)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, plans, searchParams])

    const handleSubscribe = async (planId: string) => {
        // If not logged in, redirect to login preserving plan selection
        if (!user) {
            const cycle = billingCycle
            navigate(`/login?redirect=/subscription?plan=${planId}%26cycle=${cycle}%26autostart=true`)
            return
        }

        const plan = plans.find(p => p.id === planId)
        if (!plan) return

        const method = paymentMethods[planId] ?? 'mp'

        setProcessingPlanId(planId)

        if (method === 'paypal') {
            try {
                const res = await fetch('/api/create-paypal-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan_id: planId,
                        billing_cycle: billingCycle,
                        store_id: user.store_id || '',
                        user_email: user.email || '',
                    }),
                })
                const data = await res.json() as { checkout_url?: string; error?: string }
                if (!res.ok || !data.checkout_url) {
                    showToast('error', data.error || 'Error al iniciar el pago con PayPal')
                    return
                }
                window.location.href = data.checkout_url
            } catch {
                showToast('error', 'Error de conexión. Intentá de nuevo.')
            } finally {
                setProcessingPlanId(null)
            }
            return
        }

        // MercadoPago
        try {
            const res = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_id: planId,
                    billing_cycle: billingCycle,
                    store_id: user.store_id || '',
                    user_email: user.email || '',
                }),
            })
            const data = await res.json() as { init_point?: string; error?: string }
            if (!res.ok || !data.init_point) {
                showToast('error', data.error || 'Error al iniciar el pago con MercadoPago')
                return
            }
            window.location.href = data.init_point
        } catch {
            showToast('error', 'Error de conexión. Intentá de nuevo.')
        } finally {
            setProcessingPlanId(null)
        }
    }

    const formatARS = (usd: number) => {
        if (!exchangeRate) return null
        const ars = Math.round(usd * exchangeRate)
        return `≈ $${ars.toLocaleString('es-AR')} ARS`
    }

    if (loading) return <LoadingSpinner text="Consultando estado de tu plan..." />

    const planStyles: Record<string, { icon: React.ReactNode; bg: string; border: string; shadow: string }> = {
        free:  { icon: <Shield className="w-7 h-7" />,  bg: 'bg-slate-50 text-slate-400',   border: 'border-slate-50',    shadow: 'shadow-slate-100' },
        pro:   { icon: <Zap className="w-7 h-7" />,     bg: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-500',  shadow: 'shadow-indigo-100' },
        vip:   { icon: <Crown className="w-7 h-7" />,   bg: 'bg-amber-50 text-amber-500',   border: 'border-amber-400',   shadow: 'shadow-amber-100' },
        ultra: { icon: <Zap className="w-7 h-7" />,     bg: 'bg-purple-50 text-purple-600', border: 'border-purple-500',  shadow: 'shadow-purple-100' },
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <header className="px-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Planes y Facturación</h2>
                <p className="text-slate-500 font-medium mt-1">Escala tu negocio con herramientas avanzadas y soporte dedicado.</p>
            </header>

            {/* Current Plan Banner — only show if actively paying */}
            {currentSub && currentSub.status === 'active' && (
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
                                    <div className="px-2 py-0.5 rounded-full border text-[10px] font-black uppercase bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                                        Activo ({currentSub.billing_cycle === 'annual' ? 'Anual' : 'Mensual'})
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right hidden sm:block">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Próximo Cobro</p>
                                <p className="text-lg font-bold">
                                    {currentSub.current_period_end
                                        ? new Date(currentSub.current_period_end).toLocaleDateString('es-AR')
                                        : 'N/A'}
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

            {/* Billing cycle toggle */}
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 w-full px-1">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Opciones de Mejora</span>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                            billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Anual
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                            -17%
                        </span>
                    </button>
                </div>

                {exchangeRate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tipo de cambio: <strong>1 USD = ${Math.round(exchangeRate).toLocaleString('es-AR')} ARS</strong></span>
                    </div>
                )}

                <p className="text-xs text-emerald-700 font-semibold -mt-1">
                    Plan anual recomendado: ahorrás hasta 2 meses por año frente al pago mensual.
                </p>
            </div>

            {/* Plan cards */}
            {plans.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan) => {
                        // Only block the button if the plan is ACTIVELY paying (status === 'active')
                        const isActivelyCurrent = currentSub?.plan_type === plan.id &&
                            currentSub?.status === 'active' &&
                            (currentSub?.billing_cycle === billingCycle || plan.id === 'free')

                        const style = planStyles[plan.id] || planStyles.free
                        const displayPrice = billingCycle === 'monthly' ? plan.price : plan.annual_price / 12
                        const annualTotal = plan.annual_price
                        const annualSavings = plan.price > 0 ? Number(((plan.price * 12) - plan.annual_price).toFixed(2)) : 0
                        const arsPrice = plan.price > 0 && exchangeRate
                            ? formatARS(billingCycle === 'monthly' ? plan.price : plan.annual_price)
                            : null
                        const isProcessing = processingPlanId === plan.id
                        const selectedMethod = paymentMethods[plan.id] ?? 'mp'

                        return (
                            <Card
                                key={plan.id}
                                className={`group relative flex flex-col p-6 transition-all duration-500 hover:-translate-y-2 border-2 ${
                                    plan.is_popular ? `${style.border} shadow-2xl ${style.shadow}` : 'border-slate-50'
                                }`}
                            >
                                {plan.is_popular && (
                                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase px-6 py-2 rounded-full tracking-widest shadow-xl ${
                                        plan.id === 'pro' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-amber-600 shadow-amber-200'
                                    }`}>
                                        Más Popular
                                    </div>
                                )}

                                {/* Icon + name */}
                                <div className="mb-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${style.bg} ${style.shadow} shadow-lg`}>
                                        {style.icon}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>
                                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{plan.description}</p>

                                    {/* Price in USD */}
                                    <div className="mt-3 flex items-baseline gap-1">
                                        {plan.id !== 'free' && plan.id !== 'ultra' && (
                                            <span className="text-slate-400 text-xs font-bold">USD</span>
                                        )}
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                            {plan.id === 'ultra' ? 'Custom' : plan.price === 0 ? '$0' : `$${displayPrice.toFixed(2)}`}
                                        </span>
                                        {plan.id !== 'ultra' && <span className="text-slate-400 text-xs font-bold">/ mes</span>}
                                    </div>

                                    {/* ARS estimate */}
                                    {arsPrice && (
                                        <p className="text-[11px] text-slate-400 font-medium mt-1">{arsPrice}</p>
                                    )}

                                    {/* Annual breakdown */}
                                    {billingCycle === 'annual' && annualTotal > 0 && (
                                        <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
                                                Facturado anualmente (USD ${annualTotal})
                                            </p>
                                            {exchangeRate && (
                                                <p className="text-[10px] text-emerald-600 font-semibold">
                                                    ≈ ${Math.round(annualTotal * exchangeRate).toLocaleString('es-AR')} ARS · Ahorrás USD ${annualSavings}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ROI message */}
                                <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <p className="text-xs text-indigo-700 font-semibold">
                                        {ROI_MESSAGES[plan.id] || ''}
                                    </p>
                                </div>

                                {/* VIP differentiators */}
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

                                {/* Features */}
                                <div className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feature, i) => {
                                        const isIA = feature.toLowerCase().includes('ia')
                                        return (
                                            <div key={i} className={`flex items-start gap-3 ${isIA ? 'p-2 rounded-xl bg-violet-50 border border-violet-100' : ''}`}>
                                                <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${isIA ? 'bg-violet-100 border-violet-200' : 'bg-emerald-50 border-emerald-100'}`}>
                                                    <Check className={`w-3 h-3 ${isIA ? 'text-violet-700' : 'text-emerald-600'}`} />
                                                </div>
                                                <span className={`text-[11px] font-bold leading-tight ${isIA ? 'text-violet-800' : 'text-slate-600'}`}>{feature}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Payment method selector — only for paid plans */}
                                {plan.id !== 'free' && plan.id !== 'ultra' && !isActivelyCurrent && (
                                    <div className="mb-3 flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            onClick={() => setPaymentMethods(m => ({ ...m, [plan.id]: 'mp' }))}
                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                selectedMethod === 'mp'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            MercadoPago 🇦🇷
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethods(m => ({ ...m, [plan.id]: 'paypal' }))}
                                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                                selectedMethod === 'paypal'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            PayPal 🌎
                                        </button>
                                    </div>
                                )}

                                {/* CTA */}
                                <button
                                    onClick={() => {
                                        if (plan.id === 'ultra') {
                                            window.open('https://wa.me/5491165689145?text=Hola! Quiero info sobre el plan VENDEx ULTRA', '_blank')
                                        } else if (plan.id !== 'free') {
                                            handleSubscribe(plan.id)
                                        }
                                    }}
                                    disabled={isActivelyCurrent || isProcessing || plan.id === 'free'}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isActivelyCurrent || plan.id === 'free'
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : plan.id === 'pro'
                                                ? 'bg-indigo-600 text-white hover:bg-slate-900 shadow-xl shadow-indigo-100'
                                                : plan.id === 'vip'
                                                    ? 'bg-amber-500 text-white hover:bg-slate-900 shadow-xl shadow-amber-100'
                                                    : 'bg-purple-600 text-white hover:bg-slate-900 shadow-xl shadow-purple-100'
                                    }`}
                                >
                                    {isProcessing
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : null
                                    }
                                    {isActivelyCurrent
                                        ? 'Tu Plan Actual'
                                        : plan.id === 'ultra'
                                            ? 'Contactar'
                                            : plan.id === 'free'
                                                ? 'Plan Gratuito'
                                                : isProcessing
                                                    ? 'Procesando...'
                                                    : 'Suscribirse'}
                                    {!isActivelyCurrent && plan.id !== 'free' && !isProcessing && (
                                        <ArrowRight className="w-4 h-4" />
                                    )}
                                </button>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
