import { useParams, Link } from 'react-router-dom'
import {
    ArrowLeft,
    Store,
    ExternalLink,
    Calendar,
    Shield,
    CreditCard,
    Activity,
    CheckCircle,
    AlertTriangle,
    Mail,
    Smartphone
} from 'lucide-react'

export default function SATenantDetailPage() {
    const { id } = useParams<{ id: string }>()

    // Mock data para el detalle
    const tenant = {
        id,
        name: 'Morfi Viandas Retiro',
        slug: 'morfi-viandas-retiro',
        email: 'contacto@morfiviandas.com',
        whatsapp: '5491122334455',
        status: 'active',
        plan: 'Premium',
        created_at: '2024-02-18',
        last_login: '2024-02-21 14:30',
        total_products: 124,
        total_orders: 842,
        total_revenue: '$142,500',
        country: 'AR',
        custom_domain: 'morfiviandas.com',
        flags: {
            enable_coupons: true,
            enable_schedules: true,
            enable_analytics: true
        }
    }

    return (
        <div className="space-y-8 pb-10">
            <header className="flex items-center gap-4">
                <Link to="/sa/tenants" className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{tenant.name}</h2>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-black rounded-full border border-emerald-100 uppercase tracking-widest">
                            {tenant.status}
                        </span>
                    </div>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                        ID: {tenant.id} • {tenant.email}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ventas Totales</p>
                            <h4 className="text-xl font-bold text-slate-900">{tenant.total_revenue}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pedidos</p>
                            <h4 className="text-xl font-bold text-slate-900">{tenant.total_orders}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Productos</p>
                            <h4 className="text-xl font-bold text-slate-900">{tenant.total_products}</h4>
                        </div>
                    </div>

                    {/* Configuration Card */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Configuración del Tenant
                            </h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Plan Actual</label>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-900">{tenant.plan}</span>
                                        <button className="text-blue-600 text-xs font-bold hover:underline">Cambiar</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Dominio Personalizado</label>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-900 truncate">{tenant.custom_domain || 'Ninguno'}</span>
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Feature Flags (Permisos de Plan)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {Object.entries(tenant.flags).map(([flag, enabled]) => (
                                        <div key={flag} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 capitalize">{flag.replace('enable_', '').replace('_', ' ')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Placeholder */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-lg text-slate-900">Actividad del Tenant</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            {[
                                { event: 'Liquidación de pagos procesada', time: 'Hoy, 10:45 AM' },
                                { event: 'Nuevo producto editado: Burger Triple', time: 'Ayer, 08:20 PM' },
                                { event: 'Cambio de plan: Pro -> Premium', time: '18 Feb, 2024' },
                                { event: 'Tienda creada exitosamente', time: '15 Feb, 2024' }
                            ].map((activity, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{activity.event}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 mb-4">Acciones Críticas</h3>
                        <button className="w-full bg-slate-100 text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                            Iniciar Sesión como Merchant
                        </button>
                        <button className="w-full border border-rose-200 text-rose-600 font-bold py-3 rounded-xl hover:bg-rose-50 transition-colors">
                            Suspender Tienda
                        </button>
                        <button className="w-full text-slate-400 text-xs font-bold hover:text-rose-600 transition-colors pt-2">
                            Eliminar Permanentemente
                        </button>
                    </div>

                    {/* Contact Details */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-6">Datos de Contacto</h3>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</p>
                                    <p className="text-sm font-bold text-slate-900 truncate">{tenant.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp</p>
                                    <p className="text-sm font-bold text-slate-900">+{tenant.whatsapp}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Miembro desde</p>
                                    <p className="text-sm font-bold text-slate-900">{tenant.created_at}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
