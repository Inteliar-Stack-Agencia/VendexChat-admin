import { Bot, Zap } from 'lucide-react'
import { Card, Button } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'

export default function BotConfigPage() {
    return (
        <FeatureGuard feature="bot" minPlan="vip">
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">VENDEx Bot (IA)</h1>
                        <p className="text-sm text-gray-500">Automatiza tus ventas y atención al cliente con Inteligencia Artificial.</p>
                    </div>
                </div>

                <Card className="flex flex-col items-center justify-center py-20 text-center bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 animate-pulse">
                        <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Módulo en Desarrollo</h2>
                    <p className="text-slate-500 max-w-md mt-4 font-medium">
                        Estamos entrenando a nuestro Bot para que pueda cerrar ventas por ti en WhatsApp.
                        Este módulo exclusivo VIP estará disponible muy pronto.
                    </p>

                    <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-sm w-full">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">¿Qué incluirá?</h4>
                        <ul className="text-left space-y-3">
                            <li className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                                <Zap className="w-4 h-4 text-amber-500 fill-current" /> Respuestas 24/7 automáticas
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                                <Zap className="w-4 h-4 text-amber-500 fill-current" /> Procesamiento de pedidos por IA
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                                <Zap className="w-4 h-4 text-amber-500 fill-current" /> Integración con tu catálogo real
                            </li>
                        </ul>
                    </div>
                </Card>
            </div>
        </FeatureGuard>
    )
}
