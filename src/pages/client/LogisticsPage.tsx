import { Truck, MapPin, Zap } from 'lucide-react'
import { Card, Button } from '../../components/common'
import FeatureGuard from '../../components/FeatureGuard'

export default function LogisticsPage() {
    return (
        <FeatureGuard feature="logistics" minPlan="vip">
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cabify Logistics</h1>
                        <p className="text-sm text-gray-500">Gestiona tus envíos de última milla integrados directamente con Cabify.</p>
                    </div>
                </div>

                <Card className="flex flex-col items-center justify-center py-20 text-center bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                    <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-100 animate-bounce">
                        <Truck className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Integración en Desarrollo</h2>
                    <p className="text-slate-500 max-w-md mt-4 font-medium">
                        Estamos trabajando junto a <span className="text-emerald-600 font-bold">Cabify Logistics</span> para que puedas enviar tus pedidos
                        con solo un click desde este panel. Módulo exclusivo VIP.
                    </p>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full text-left">
                        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Cotización Real</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Conoce el costo del envío antes de solicitar el driver.</p>
                        </div>
                        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                                <Zap className="w-4 h-4" />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Seguimiento</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Tus clientes recibirán el link de tracking por WhatsApp automáticamente.</p>
                        </div>
                    </div>

                    <Button className="mt-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl shadow-emerald-100">
                        Quiero ser Beta Tester
                    </Button>
                </Card>
            </div>
        </FeatureGuard>
    )
}
