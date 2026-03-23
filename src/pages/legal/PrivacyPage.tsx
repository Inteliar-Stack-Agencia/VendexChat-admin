import { useNavigate } from 'react-router-dom'
import { Shield, ChevronLeft } from 'lucide-react'
import { Button } from '../../components/common'

export default function PrivacyPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-900">VENDExChat</span>
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

            <main className="flex-1 py-12 px-4">
                <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
                    <header className="mb-10 text-center">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Política de Privacidad
                        </h1>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
                            Última actualización: marzo 2026
                        </p>
                    </header>

                    <div className="space-y-10 text-slate-600 leading-relaxed">

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">1. Responsable del Tratamiento</h2>
                            <p>
                                Inteliar Stack, República Argentina.<br />
                                Contacto:{' '}
                                <a href="mailto:inteliarstack.ia@gmail.com" className="text-emerald-600 hover:underline">
                                    inteliarstack.ia@gmail.com
                                </a>
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900">2. Datos que Recolectamos</h2>
                            <div className="space-y-3">
                                <p><span className="font-semibold text-slate-700">2.1. Datos del comerciante (Cliente):</span></p>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                    <li>Nombre, email y contraseña al registrarse</li>
                                    <li>Datos de la tienda: nombre, logo, descripción, productos</li>
                                    <li>Historial de pedidos y clientes de la tienda</li>
                                    <li>Datos de facturación procesados por Mercado Pago</li>
                                </ul>
                                <p><span className="font-semibold text-slate-700">2.2. Datos de uso:</span></p>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                    <li>Logs de acceso y actividad en el panel</li>
                                    <li>Métricas de rendimiento de la tienda</li>
                                </ul>
                                <p><span className="font-semibold text-slate-700">2.3. Datos que NO recolectamos:</span></p>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                    <li>Datos de tarjetas de crédito (procesados directamente por Mercado Pago)</li>
                                    <li>Contraseñas en texto plano</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">3. Para qué Usamos los Datos</h2>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>Proveer y mejorar el Servicio</li>
                                <li>Procesar pagos de suscripciones</li>
                                <li>Enviar notificaciones relacionadas al Servicio</li>
                                <li>Cumplir obligaciones legales</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">4. Terceros con Acceso a los Datos</h2>
                            <p>Para operar el Servicio utilizamos los siguientes proveedores:</p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>Supabase (base de datos y autenticación) — supabase.com</li>
                                <li>Cloudflare (infraestructura y CDN) — cloudflare.com</li>
                                <li>Mercado Pago (procesamiento de pagos) — mercadopago.com.ar</li>
                                <li>WhatsApp/Meta (envío de notificaciones) — whatsapp.com</li>
                            </ul>
                            <p>
                                Estos proveedores tienen sus propias políticas de privacidad y están
                                contractualmente obligados a proteger los datos.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">5. Retención de Datos</h2>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>Datos activos: mientras dure la suscripción</li>
                                <li>Tras cancelación: 30 días de retención, luego eliminación definitiva</li>
                                <li>Datos de facturación: 5 años por obligaciones impositivas</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">6. Derechos del Usuario</h2>
                            <p>El Cliente tiene derecho a:</p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>Acceder a sus datos personales</li>
                                <li>Rectificar datos incorrectos</li>
                                <li>Solicitar la eliminación de sus datos</li>
                                <li>Exportar sus datos en formato CSV</li>
                            </ul>
                            <p>
                                Para ejercer estos derechos:{' '}
                                <a href="mailto:inteliarstack.ia@gmail.com" className="text-emerald-600 hover:underline">
                                    inteliarstack.ia@gmail.com
                                </a>
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">7. Seguridad</h2>
                            <p>Implementamos medidas de seguridad estándar de la industria:</p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>Cifrado en tránsito (HTTPS/TLS)</li>
                                <li>Autenticación segura via Supabase Auth</li>
                                <li>Acceso restringido por roles (Row Level Security)</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">8. Cookies</h2>
                            <p>
                                El Servicio utiliza cookies de sesión para mantener al usuario autenticado.
                                No utilizamos cookies de seguimiento ni publicidad.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">9. Menores</h2>
                            <p>
                                El Servicio no está dirigido a menores de 18 años.
                                No recolectamos datos de menores conscientemente.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">10. Cambios a esta Política</h2>
                            <p>
                                Notificaremos cambios significativos por email con 15 días de anticipación.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">11. Contacto</h2>
                            <p>
                                <a href="mailto:inteliarstack.ia@gmail.com" className="text-emerald-600 hover:underline">
                                    inteliarstack.ia@gmail.com
                                </a>
                            </p>
                        </section>
                    </div>

                    <footer className="mt-16 pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-sm">
                            © 2026 Inteliar Stack. Todos los derechos reservados.
                        </p>
                    </footer>
                </article>
            </main>
        </div>
    )
}
