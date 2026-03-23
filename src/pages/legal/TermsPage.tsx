import { useNavigate } from 'react-router-dom'
import { ScrollText, ChevronLeft } from 'lucide-react'
import { Button } from '../../components/common'

export default function TermsPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <ScrollText className="w-4 h-4 text-white" />
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
                            Términos y Condiciones de Servicio
                        </h1>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
                            Última actualización: marzo 2026
                        </p>
                    </header>

                    <div className="space-y-10 text-slate-600 leading-relaxed">

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">1. Aceptación de los Términos</h2>
                            <p>
                                Al registrarse y utilizar VendexChat (en adelante "el Servicio"), el comerciante
                                (en adelante "el Cliente") acepta quedar vinculado por estos Términos y Condiciones.
                                Si no está de acuerdo con alguno de estos términos, no debe utilizar el Servicio.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">2. Descripción del Servicio</h2>
                            <p>
                                VendexChat es una plataforma SaaS que permite a comerciantes crear tiendas online
                                con catálogo de productos, gestión de pedidos y checkout automatizado vía WhatsApp.
                                El Servicio es provisto por Inteliar Stack, con domicilio en la República Argentina.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900">3. Planes y Precios</h2>
                            <div className="space-y-3">
                                <p><span className="font-semibold text-slate-700">3.1.</span> El Servicio se ofrece bajo los siguientes planes:</p>
                                <ul className="list-disc list-inside space-y-1 pl-4">
                                    <li>Plan Free: sin costo, funcionalidades básicas</li>
                                    <li>Plan Pro: USD 13,99/mes o USD 139,90/año</li>
                                    <li>Plan VIP: USD 19,99/mes o USD 199,90/año</li>
                                    <li>Plan Ultra: precio a convenir según requerimientos</li>
                                </ul>
                                <p>
                                    <span className="font-semibold text-slate-700">3.2.</span> Los precios se expresan en dólares estadounidenses (USD).
                                    El cobro se procesa en pesos argentinos (ARS) al tipo de cambio vigente
                                    al momento del pago, a través de Mercado Pago.
                                </p>
                                <div className="space-y-2">
                                    <p><span className="font-semibold text-slate-700">3.3. Ajuste de Precios</span></p>
                                    <p>
                                        Los precios de los planes están sujetos a actualización. La Empresa
                                        se reserva el derecho de modificar los precios en cualquier momento
                                        por razones que incluyen, pero no se limitan a: inflación, variación
                                        del tipo de cambio USD/ARS, costos operativos o cambios en el mercado.
                                    </p>
                                    <p>Ante cualquier modificación de precios:</p>
                                    <ul className="list-disc list-inside space-y-1 pl-4">
                                        <li>El Cliente será notificado por email con 30 días de anticipación</li>
                                        <li>El nuevo precio aplicará a partir del siguiente ciclo de facturación</li>
                                        <li>El Cliente podrá cancelar su suscripción sin cargo si no acepta el nuevo precio, antes de que entre en vigencia</li>
                                        <li>Los precios vigentes siempre estarán disponibles en vendexchat.app/pricing</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">4. Facturación y Pagos</h2>
                            <p>
                                <span className="font-semibold text-slate-700">4.1.</span> El cobro se realiza de forma mensual o anual según el plan elegido,
                                a través de Mercado Pago.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">4.2.</span> En caso de falta de pago, el Servicio será suspendido a los 3 días
                                del vencimiento del período contratado. Los datos del Cliente se conservarán
                                por 30 días adicionales antes de ser eliminados definitivamente.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">4.3.</span> No se realizan reembolsos por períodos parciales ya facturados,
                                salvo error comprobable de la Empresa.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">5. Cancelación</h2>
                            <p>
                                <span className="font-semibold text-slate-700">5.1.</span> El Cliente puede cancelar su suscripción en cualquier momento desde
                                el panel de administración. La cancelación tendrá efecto al finalizar
                                el período ya abonado.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">5.2.</span> La Empresa puede cancelar o suspender el Servicio si el Cliente
                                viola estos Términos, sin obligación de reembolso.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">6. Propiedad de los Datos</h2>
                            <p>
                                <span className="font-semibold text-slate-700">6.1.</span> Los datos ingresados por el Cliente (productos, clientes, pedidos)
                                son de su exclusiva propiedad.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">6.2.</span> La Empresa no vende ni cede los datos del Cliente a terceros,
                                salvo requerimiento legal.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">6.3.</span> El Cliente puede solicitar la exportación o eliminación de sus datos
                                en cualquier momento escribiendo a{' '}
                                <a href="mailto:inteliarstack.ia@gmail.com" className="text-emerald-600 hover:underline">
                                    inteliarstack.ia@gmail.com
                                </a>
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">7. Limitación de Responsabilidad</h2>
                            <p>
                                <span className="font-semibold text-slate-700">7.1.</span> El Servicio se provee "tal cual". La Empresa no garantiza disponibilidad
                                ininterrumpida del Servicio.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">7.2.</span> La Empresa no será responsable por pérdidas de ventas, datos o
                                ganancias derivadas de interrupciones del Servicio, errores del sistema
                                o fallas de terceros (WhatsApp, Mercado Pago, Cloudflare, Supabase).
                            </p>
                            <p>
                                <span className="font-semibold text-slate-700">7.3.</span> La responsabilidad máxima de la Empresa ante el Cliente no podrá
                                exceder el monto abonado en el último mes de servicio.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">8. Uso Aceptable</h2>
                            <p>El Cliente se compromete a no utilizar el Servicio para:</p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>Vender productos ilegales o prohibidos</li>
                                <li>Realizar spam o comunicaciones no solicitadas</li>
                                <li>Intentar vulnerar la seguridad de la plataforma</li>
                                <li>Revender el Servicio sin autorización expresa de la Empresa</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">9. Modificaciones al Servicio</h2>
                            <p>
                                La Empresa puede modificar, agregar o eliminar funcionalidades del Servicio
                                en cualquier momento. Los cambios significativos serán comunicados con
                                al menos 15 días de anticipación.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">10. Jurisdicción</h2>
                            <p>
                                Estos Términos se rigen por las leyes de la República Argentina.
                                Cualquier disputa será sometida a la jurisdicción de los tribunales
                                ordinarios de la Ciudad Autónoma de Buenos Aires.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-slate-900">11. Contacto</h2>
                            <p>
                                Para consultas sobre estos Términos:{' '}
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
