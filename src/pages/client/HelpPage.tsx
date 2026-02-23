import { useState } from 'react'
import { Card, Button, Modal } from '../../components/common'
import { HelpCircle, MessageSquare, Book, Video, ExternalLink, Phone, Truck, CreditCard, Globe, Sparkles, Image as ImageIcon } from 'lucide-react'

const GUIDES_CONTENT = {
    logistics: {
        title: "Logística y Envíos",
        icon: <Truck className="w-8 h-8 text-emerald-600" />,
        content: (
            <div className="space-y-6">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-sm text-emerald-900 font-medium">Configura cómo tus clientes reciben sus pedidos desde el módulo de Logística.</p>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">📍</div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Zonas de Envío</h4>
                            <p className="text-xs text-slate-500">Puedes crear radios de entrega (ej. 5km) o definir barrios específicos con costos fijos.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">🏠</div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Retiro en Local</h4>
                            <p className="text-xs text-slate-500">Activa el punto de retiro para que los clientes no paguen envío y busquen su pedido.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">⏰</div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Tiempos de Entrega</h4>
                            <p className="text-xs text-slate-500">Informa a tus clientes cuánto demora el envío aproximandamente según la zona.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    payments: {
        title: "Pasarelas de Pago",
        icon: <CreditCard className="w-8 h-8 text-indigo-600" />,
        content: (
            <div className="space-y-6">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-sm text-indigo-900 font-medium">Ofrece múltiples formas de pago para aumentar tus ventas.</p>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">💳</div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Mercado Pago</h4>
                            <p className="text-xs text-slate-500">Vinculación directa. Tus clientes pagan con tarjeta o dinero en cuenta y tú recibes el dinero al instante.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">🏦</div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Transferencia Bancaria</h4>
                            <p className="text-xs text-slate-500">Configura tu CBU/Alias. El pedido queda "pendiente" hasta que valides el comprobante.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">💵</div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">Efectivo</h4>
                            <p className="text-xs text-slate-500">Ideal para retiros en local o delivery propio "paga al recibir".</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    domains: {
        title: "Dominios Propios",
        icon: <Globe className="w-8 h-8 text-blue-600" />,
        content: (
            <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-sm text-blue-900 font-medium">Usa tu propio dominio (ej: www.tutienda.com) para mayor profesionalismo.</p>
                </div>
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                    <p>Para configurar tu dominio debes acceder al panel de tu proveedor (GoDaddy, Nic.ar, etc) y crear un registro:</p>
                    <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono">
                        Tipo: CNAME <br />
                        Host: @ o www <br />
                        Valor: servidores.vendexchat.app
                    </div>
                    <p className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 font-bold italic">
                        Nota: Una vez configurado, el certificado SSL (candadito) se activa automáticamente en 24hs.
                    </p>
                </div>
            </div>
        )
    },
    ai_suggestions: {
        title: "Sugerencias de IA",
        icon: <Sparkles className="w-8 h-8 text-amber-500" />,
        content: (
            <div className="space-y-6">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <p className="text-sm text-amber-900 font-medium italic">Ilustra tus productos en segundos con fotos profesionales.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-black text-slate-900 text-sm uppercase mb-3 px-1">¿Cómo funciona?</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                                <span className="text-xl">🔍</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Stable Diffusion</p>
                                    <p className="text-[11px] text-slate-500">Generamos imágenes únicas y profesionales para tus productos usando el poder de Stable Diffusion de forma gratuita e ilimitada.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                                <span className="text-xl">✨</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Selección Directa</p>
                                    <p className="text-[11px] text-slate-500">Al elegir una foto, se aplica instantáneamente a tu producto. Sin descargas ni subidas manuales.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                            <ImageIcon className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">IA de Vanguardia</h4>
                            <p className="text-[11px] text-indigo-800/70 font-medium">Generá fotos de catálogo, estilo de vida y alta resolución en segundos. Olvidate de buscar en bancos de imágenes genéricos.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default function HelpPage() {
    const whatsappSupport = "https://wa.me/5491165689145?text=Hola!%20Necesito%20ayuda%20con%20VendexChat"
    const [selectedGuide, setSelectedGuide] = useState<keyof typeof GUIDES_CONTENT | null>(null)

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="px-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Ayuda</h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Saca el máximo provecho a VendexChat</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-8 hover:shadow-xl transition-all duration-300 border border-emerald-100 bg-emerald-50/30 rounded-[2.5rem] flex flex-col justify-between">
                    <div>
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                            <MessageSquare className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="font-black uppercase text-sm text-emerald-900 mb-2">Soporte Directo</h3>
                        <p className="text-emerald-800/60 text-sm font-medium mb-6">Habla con nosotros por WhatsApp para resolver dudas en minutos.</p>
                    </div>
                    <a href={whatsappSupport} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-emerald-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest w-full py-4 rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
                            Abir WhatsApp <ExternalLink className="w-3 h-3" />
                        </Button>
                    </a>
                </Card>

                <Card className="p-8 hover:shadow-xl transition-all duration-300 border border-slate-100 bg-white rounded-[2.5rem] flex flex-col justify-between">
                    <div>
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 shadow-sm">
                            <Book className="w-8 h-8" />
                        </div>
                        <h3 className="font-black uppercase text-sm text-slate-900 mb-2">Guías Rápidas</h3>
                        <div className="flex flex-col gap-2 mb-6">
                            {[
                                { id: 'logistics', label: "Logística y Envíos", icon: "🚚" },
                                { id: 'payments', label: "Pasarelas de Pago", icon: "💳" },
                                { id: 'domains', label: "Dominios Propios", icon: "🌐" },
                                { id: 'ai_suggestions', label: "Sugerencias de IA", icon: "✨" }
                            ].map((guide, i) => (
                                <div
                                    key={i}
                                    onClick={() => setSelectedGuide(guide.id as any)}
                                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors cursor-pointer"
                                >
                                    <span className="text-lg">{guide.icon}</span>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{guide.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="font-black uppercase text-[10px] tracking-widest w-full py-4 rounded-xl border-slate-100 hover:bg-slate-50 text-slate-400"
                        onClick={() => setSelectedGuide('logistics')}
                    >
                        Ver Documentación
                    </Button>
                </Card>

                <Card className="p-8 hover:shadow-xl transition-all duration-300 border border-slate-100 bg-white rounded-[2.5rem] flex flex-col justify-between">
                    <div>
                        <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 border border-orange-100 shadow-sm">
                            <Video className="w-8 h-8" />
                        </div>
                        <h3 className="font-black uppercase text-sm text-slate-900 mb-2">Tutoriales</h3>
                        <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">Aprende visualmente cómo optimizar tus ventas y configurar el bot con pasos simples.</p>
                    </div>
                    <Button variant="outline" disabled className="font-black uppercase text-[10px] tracking-widest w-full py-4 rounded-xl border-slate-100 opacity-50 text-slate-400">
                        Próximamente
                    </Button>
                </Card>
            </div>

            <Card className="p-8 md:p-12 border border-slate-100 bg-slate-50/50 rounded-[3rem] relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <HelpCircle className="w-40 h-40 text-slate-900" />
                </div>
                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                        <span className="text-emerald-600 font-black uppercase text-[10px] tracking-widest block">¿Necesitas algo más?</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Preguntas Frecuentes</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { q: "¿Cómo configurar mi dominio propio?", a: "Podes hacerlo desde Ajustes > Mi Tienda. Necesitás apuntar un CNAME a nuestros servidores." },
                            { q: "¿Cómo integrar Mercado Pago?", a: "Accedé a Pagos y vinculá tu cuenta. Es instantáneo y seguro." },
                            { q: "¿Cómo activar el Bot de WhatsApp?", a: "Disponible para planes VIP. Automatiza tus ventas 24/7." },
                            { q: "¿Cómo cobrar envíos por zona?", a: "En Logística podés definir radios de entrega y costos fijos por área." },
                            { q: "¿Los cupones son acumulables?", a: "Por defecto, los cupones no son acumulables a menos que lo desees." },
                            { q: "¿Cómo cargar productos masivamente?", a: "Usa el Importador IA para pegar listas o subir fotos de tu menú." }
                        ].map((item, i) => (
                            <div key={i} className="p-6 bg-white rounded-3xl border border-slate-100/80 hover:border-emerald-200 hover:shadow-md transition-all flex flex-col gap-2 group cursor-default">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">{item.q}</span>
                                    <Phone className="w-3 h-3 text-emerald-500 opacity-30 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8 border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 rounded-[2.5rem] flex items-center justify-between group hover:shadow-lg transition-all">
                    <div>
                        <h3 className="font-black uppercase text-sm text-indigo-900 mb-1">Comunidad VENDEx</h3>
                        <p className="text-indigo-800/60 text-xs font-medium">Sumate a nuestro canal de novedades e Instagram.</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                        <ExternalLink className="w-6 h-6" />
                    </div>
                </Card>

                <Card className="p-8 border border-slate-100 bg-white rounded-[2.5rem] flex items-center justify-between group hover:shadow-lg transition-all">
                    <div>
                        <h3 className="font-black uppercase text-sm text-slate-900 mb-1">Status del Sistema</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">Todos los sistemas operativos</p>
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-100 group-hover:rotate-12 transition-transform">
                        <Phone className="w-6 h-6" />
                    </div>
                </Card>
            </div>

            <Modal
                isOpen={!!selectedGuide}
                onClose={() => setSelectedGuide(null)}
                title={selectedGuide ? GUIDES_CONTENT[selectedGuide].title : ''}
                size="lg"
            >
                {selectedGuide && GUIDES_CONTENT[selectedGuide].content}
            </Modal>
        </div>
    )
}
