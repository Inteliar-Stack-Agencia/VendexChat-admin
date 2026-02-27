import { useNavigate, useParams } from 'react-router-dom'
import { Shield, ChevronLeft, ScrollText } from 'lucide-react'
import { Button } from '../../components/common'

const CONTENT = {
    terms: {
        title: 'Términos y Condiciones de Uso',
        lastUpdate: '27 de Febrero, 2026',
        sections: [
            {
                title: '1. Aceptación de los Términos',
                content: 'Al acceder y utilizar VendexChat, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar nuestros servicios.'
            },
            {
                title: '2. Descripción del Servicio',
                content: 'VendexChat proporciona una plataforma para que los comerciantes gestionen sus ventas a través de catálogos dinámicos conectados con WhatsApp. No somos responsables de las transacciones directas entre comerciantes y sus clientes finales.'
            },
            {
                title: '3. Responsabilidades del Usuario',
                content: 'Usted es responsable de mantener la confidencialidad de su cuenta y de todas las actividades que ocurran bajo ella. Debe proporcionar información verídica y mantener sus datos de contacto actualizados.'
            },
            {
                title: '4. Planes y Pagos',
                content: 'El uso de ciertas funciones requiere una suscripción paga. Los pagos se procesan a través de pasarelas de terceros y están sujetos a sus propias políticas de reembolso.'
            }
        ]
    },
    privacy: {
        title: 'Política de Privacidad',
        lastUpdate: '27 de Febrero, 2026',
        sections: [
            {
                title: '1. Información que Recopilamos',
                content: 'Recopilamos información personal necesaria para la prestación del servicio, incluyendo nombre, email, número de WhatsApp y datos de la tienda.'
            },
            {
                title: '2. Uso de la Información',
                content: 'Utilizamos su información para gestionar su cuenta, mejorar nuestro servicio, procesar pagos y facilitar la comunicación con sus clientes vía WhatsApp.'
            },
            {
                title: '3. Seguridad de los Datos',
                content: 'Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales contra el acceso no autorizado o la pérdida.'
            },
            {
                title: '4. Derechos del Usuario',
                content: 'Usted tiene derecho a acceder, rectificar o eliminar sus datos personales en cualquier momento a través de la configuración de su cuenta.'
            }
        ]
    }
}

export default function LegalPage() {
    const { type } = useParams<{ type: 'terms' | 'privacy' }>()
    const navigate = useNavigate()

    const content = type === 'privacy' ? CONTENT.privacy : CONTENT.terms

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Navbar simplificado */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            {type === 'privacy' ? (
                                <Shield className="w-4 h-4 text-white" />
                            ) : (
                                <ScrollText className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <span className="font-bold text-slate-900">VendexChat</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="text-slate-500"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Volver
                    </Button>
                </div>
            </nav>

            {/* Contenido */}
            <main className="flex-1 py-12 px-4">
                <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
                    <header className="mb-10 text-center">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                            {content.title}
                        </h1>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
                            Última actualización: {content.lastUpdate}
                        </p>
                    </header>

                    <div className="space-y-10">
                        {content.sections.map((section, idx) => (
                            <section key={idx} className="space-y-3">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {section.title}
                                </h2>
                                <p className="text-slate-600 leading-relaxed">
                                    {section.content}
                                </p>
                            </section>
                        ))}
                    </div>

                    <footer className="mt-16 pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-sm">
                            ¿Tiene preguntas? Contacte a soporte a través de nuestro sitio oficial.
                        </p>
                    </footer>
                </article>
            </main>
        </div>
    )
}
