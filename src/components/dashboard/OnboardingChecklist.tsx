import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Store, Package, CreditCard, ChevronRight } from 'lucide-react'
import { Card } from '../common'
import type { Tenant, DashboardStats } from '../../types'

interface OnboardingStep {
    id: string
    label: string
    description: string
    icon: React.ElementType
    path: string
    isCompleted: boolean
}

interface OnboardingChecklistProps {
    tenant: Tenant | null
    stats: DashboardStats | null
}

export default function OnboardingChecklist({ tenant, stats }: OnboardingChecklistProps) {
    // Lógica para determinar pasos completados
    const steps: OnboardingStep[] = [
        {
            id: 'profile',
            label: 'Personaliza tu Tienda',
            description: 'Sube tu logo y configura tu número de WhatsApp.',
            icon: Store,
            path: '/settings#general',
            isCompleted: !!(tenant?.logo_url || tenant?.whatsapp)
        },
        {
            id: 'products',
            label: 'Crea tu primer Producto',
            description: 'Agrega al menos un producto para empezar a vender.',
            icon: Package,
            path: '/products/new',
            isCompleted: (stats?.active_products || 0) > 0
        },
        {
            id: 'payments',
            label: 'Métodos de Pago',
            description: 'Activa cómo quieres que te paguen tus clientes.',
            icon: CreditCard,
            path: '/settings#payments',
            isCompleted: Object.values(tenant?.metadata?.payment_methods || {}).some(v => v === true)
        }
    ]

    const completedCount = steps.filter(s => s.isCompleted).length
    const progressPercent = Math.round((completedCount / steps.length) * 100)

    if (completedCount === steps.length) return null // Ocultar si todo está listo

    return (
        <Card className="p-6 border-indigo-100 bg-indigo-50/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/20 rounded-full -mr-16 -mt-16 blur-2xl" />

            <div className="relative z-10 space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-indigo-900 tracking-tight">¡Bienvenido a VendexChat! 🚀</h2>
                        <p className="text-indigo-600/80 text-sm font-medium">Completa estos pasos para lanzar tu tienda profesionalmente.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-indigo-600">{progressPercent}%</span>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Progreso</p>
                    </div>
                </header>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Steps List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {steps.map((step) => (
                        <Link key={step.id} to={step.path}>
                            <div className={`p-4 rounded-xl border transition-all duration-300 group hover:shadow-md ${step.isCompleted
                                ? 'bg-white border-emerald-100'
                                : 'bg-white border-slate-100 hover:border-indigo-200'
                                }`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${step.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'
                                        }`}>
                                        <step.icon className="w-5 h-5" />
                                    </div>
                                    {step.isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-200 group-hover:text-indigo-200" />
                                    )}
                                </div>
                                <h3 className={`font-bold text-sm ${step.isCompleted ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {step.label}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {step.description}
                                </p>
                                {!step.isCompleted && (
                                    <div className="mt-3 flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                        Configurar <ChevronRight className="w-3 h-3 ml-1" />
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </Card>
    )
}
