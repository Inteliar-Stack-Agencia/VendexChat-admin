import {
    MessageSquare, Brain, ShoppingBag, Zap, Clock,
    BookOpen, TrendingUp, Users, CheckCircle2, ArrowRight,
    Sparkles, Database, RefreshCw,
} from 'lucide-react'
import FeatureGuard from '../../components/FeatureGuard'
import { Card } from '../../components/common'
import { useAuth } from '../../contexts/AuthContext'

const WA_CONTACT = 'https://wa.me/5491100000000'

const AGENT_FEATURES = [
    {
        icon: Brain,
        color: 'violet',
        title: 'Agente conversacional real',
        desc: 'No es un bot de respuestas fijas. Entiende el contexto de la conversación, recuerda lo que el cliente dijo y razona antes de responder.',
    },
    {
        icon: Database,
        color: 'indigo',
        title: 'Contexto total de tu negocio',
        desc: 'El agente conoce tu catálogo, precios, stock, horarios, formas de pago y toda la información que vos le configurés.',
    },
    {
        icon: RefreshCw,
        color: 'blue',
        title: 'Aprende con feedback continuo',
        desc: 'Cada vez que corregís una respuesta o agregás una pregunta frecuente, el agente incorpora ese aprendizaje y mejora.',
    },
    {
        icon: ShoppingBag,
        color: 'emerald',
        title: 'Gestión de pedidos por chat',
        desc: 'Puede tomar pedidos, consultar disponibilidad, calcular totales y derivar al equipo humano cuando sea necesario.',
    },
    {
        icon: Clock,
        color: 'amber',
        title: 'Disponible 24/7',
        desc: 'Responde fuera de horario, los fines de semana y en momentos de alta demanda sin intervención humana.',
    },
    {
        icon: TrendingUp,
        color: 'rose',
        title: 'Mejora con el tiempo',
        desc: 'Cuanto más interacciones tiene, mejor entiende los patrones de tus clientes y más precisas se vuelven sus respuestas.',
    },
]

const HOW_IT_WORKS = [
    {
        step: '01',
        title: 'Configuración inicial',
        desc: 'El equipo de VENDEx configura el agente con toda la información de tu negocio: catálogo, horarios, políticas de entrega, formas de pago y más.',
        color: 'indigo',
    },
    {
        step: '02',
        title: 'Conexión a WhatsApp Business',
        desc: 'Vinculamos el agente a tu número de WhatsApp Business. Desde ese momento empieza a responder automáticamente.',
        color: 'violet',
    },
    {
        step: '03',
        title: 'Entrenamiento con feedback',
        desc: 'Desde el panel podés ver las conversaciones, corregir respuestas y agregar preguntas frecuentes. El agente aprende de cada corrección.',
        color: 'blue',
    },
    {
        step: '04',
        title: 'Mejora continua',
        desc: 'El equipo de VENDEx revisa el desempeño periódicamente y ajusta el agente para que siga mejorando.',
        color: 'emerald',
    },
]

function WhatsAppAgentInner() {
    const { subscription } = useAuth()
    const plan = subscription?.plan_type ?? 'free'

    const waMessage = encodeURIComponent(
        `Hola, tengo el plan ${plan.toUpperCase()} de VENDEx y quiero activar el Agente IA de WhatsApp para mi tienda. ¿Cómo arrancamos?`
    )

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl">

            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                    <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Agente IA WhatsApp</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Un agente conversacional entrenado con el contexto de tu negocio, disponible 24/7 en tu WhatsApp.
                    </p>
                </div>
            </div>

            {/* CTA principal */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Desarrollo a medida</span>
                        </div>
                        <p className="text-slate-800 font-bold text-base">
                            Este módulo requiere configuración personalizada por el equipo de VENDEx.
                        </p>
                        <p className="text-slate-500 text-sm mt-1">
                            No es una activación automática — construimos el agente junto con vos, adaptado 100% a tu negocio. Escribinos para coordinar.
                        </p>
                    </div>
                    <a
                        href={`${WA_CONTACT}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-200"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Contactar al equipo
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </Card>

            {/* Qué es un agente vs un bot */}
            <Card className="p-6 border-slate-200">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
                    ¿Qué diferencia hay con un bot tradicional?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Bot tradicional</p>
                        {[
                            'Responde con frases fijas',
                            'No entiende el contexto',
                            'Se rompe ante preguntas inesperadas',
                            'Requiere actualización manual de cada respuesta',
                        ].map(t => (
                            <div key={t} className="flex items-start gap-2 text-sm text-slate-500">
                                <span className="text-slate-300 font-black mt-0.5">✕</span>
                                {t}
                            </div>
                        ))}
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Agente IA VENDEx</p>
                        {[
                            'Entiende el lenguaje natural del cliente',
                            'Recuerda el contexto de la conversación',
                            'Maneja preguntas complejas y fuera de guión',
                            'Aprende con cada corrección que hacés',
                        ].map(t => (
                            <div key={t} className="flex items-start gap-2 text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                {t}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Capacidades */}
            <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Capacidades del agente
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AGENT_FEATURES.map(({ icon: Icon, color, title, desc }) => (
                        <Card key={title} className="p-5">
                            <div className={`w-9 h-9 rounded-xl bg-${color}-100 flex items-center justify-center mb-3`}>
                                <Icon className={`w-4 h-4 text-${color}-600`} />
                            </div>
                            <p className="text-sm font-black text-slate-800 mb-1">{title}</p>
                            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Cómo funciona el entrenamiento */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-5">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Cómo funciona el entrenamiento</h2>
                </div>
                <div className="space-y-4">
                    {HOW_IT_WORKS.map(({ step, title, desc, color }) => (
                        <div key={step} className="flex gap-4">
                            <div className={`w-9 h-9 rounded-xl bg-${color}-100 flex items-center justify-center flex-shrink-0 text-xs font-black text-${color}-600`}>
                                {step}
                            </div>
                            <div className="pt-1">
                                <p className="text-sm font-black text-slate-800">{title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Lo que el equipo necesita de vos */}
            <Card className="p-6 bg-indigo-50 border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest">¿Qué necesitamos de tu parte?</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        'Información de tu negocio (qué vendés, a quién, zona de cobertura)',
                        'Preguntas frecuentes que suelen hacer tus clientes',
                        'Políticas de envío, devolución y pago',
                        'Horarios de atención',
                        'Tono y estilo de comunicación que usás con tus clientes',
                        'Casos donde el bot debe derivar a un humano',
                    ].map(item => (
                        <div key={item} className="flex items-start gap-2 text-sm text-indigo-700">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                            {item}
                        </div>
                    ))}
                </div>
            </Card>

            {/* CTA final */}
            <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-slate-900">Listo para arrancar</p>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Escribinos por WhatsApp y en 24-48hs hábiles coordinamos la configuración inicial de tu agente.
                        </p>
                    </div>
                    <a
                        href={`${WA_CONTACT}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-200"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Solicitar activación
                    </a>
                </div>
            </Card>

        </div>
    )
}

export default function WhatsAppBotPage() {
    return (
        <FeatureGuard feature="bot" minPlan="ultra">
            <WhatsAppAgentInner />
        </FeatureGuard>
    )
}
