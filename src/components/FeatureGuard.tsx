import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './common'

interface FeatureGuardProps {
    children: ReactNode
    feature: 'analytics' | 'coupons' | 'white-label' | 'bot' | 'logistics' | 'pro-tools' | 'marketing' | 'custom-domain' | 'ai-importer' | 'ai-analyst'
    minPlan?: 'advance' | 'pro' | 'premium' | 'vip'
    fallback?: 'blur' | 'hide' | 'message'
}

export default function FeatureGuard({
    children,
    feature,
    minPlan = 'pro',
    fallback = 'message'
}: FeatureGuardProps) {
    const { subscription, isSuperadmin } = useAuth()

    // Superadmins don't have restrictions
    if (isSuperadmin) return <>{children}</>

    const currentPlan = subscription?.plan_type || 'free'

    const planWeight = {
        'free': 0,
        'advance': 1,
        'pro': 2,
        'premium': 3,
        'vip': 4
    }

    const hasAccess = planWeight[currentPlan as keyof typeof planWeight] >= planWeight[minPlan]

    if (hasAccess) return <>{children}</>

    // Fallback logic
    if (fallback === 'hide') return null

    if (fallback === 'blur') {
        return (
            <div className="relative group">
                <div className="blur-[2px] pointer-events-none select-none opacity-50">
                    {children}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[1px] rounded-xl transition-all group-hover:bg-white/40">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center max-w-[280px]">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest mb-1">Módulo Bloqueado</h4>
                        <p className="text-[11px] text-slate-500 font-medium mb-4">
                            Requiere plan <span className="text-indigo-600 font-bold uppercase">{minPlan}</span> para acceder a {feature === 'analytics' ? 'estadísticas avanzadas' : 'esta función'}.
                        </p>
                        <Link to="/subscription">
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] py-2 px-4 flex items-center gap-2">
                                <Zap className="w-3 h-3 fill-current" /> Mejorar Plan
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // Default: 'message' card
    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Módulo Exclusivo {minPlan.toUpperCase()}</h3>
                <p className="text-indigo-100 text-sm mt-2 max-w-sm font-medium">
                    Actualiza tu cuenta para desbloquear {feature === 'analytics' ? 'gráficos real-time' : 'herramientas de marketing'} y llevar tu tienda al siguiente nivel.
                </p>
            </div>
            <Link to="/subscription">
                <Button className="bg-white text-indigo-600 font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:bg-slate-50 shadow-lg shadow-black/10">
                    Explorar Planes
                </Button>
            </Link>
        </div>
    )
}
