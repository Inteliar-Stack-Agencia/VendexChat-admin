import { Percent, Plus } from 'lucide-react'
import { Card, Button } from '../../components/common'

export default function CouponsPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cupones de Descuento</h1>
                    <p className="text-sm text-gray-500">Próximamente: Crea y gestiona campañas de descuento para tus clientes.</p>
                </div>
                <Button variant="primary" disabled>
                    <Plus className="w-4 h-4" />
                    Nuevo Cupón
                </Button>
            </div>

            <Card className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <Percent className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Módulo en desarrollo</h3>
                <p className="text-gray-500 max-w-sm mt-1">
                    Estamos trabajando para que puedas ofrecer descuentos exclusivos a tus clientes de WhatsApp muy pronto.
                </p>
            </Card>
        </div>
    )
}
