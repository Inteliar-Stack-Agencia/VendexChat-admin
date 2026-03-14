import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { SubscriptionPlan } from '../../types'
import { showToast } from '../common/Toast'

// Inicializar con la Public Key del .env
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY)

interface MPPaymentBrickProps {
    plan: SubscriptionPlan
    billingCycle: 'monthly' | 'annual'
    storeId: string
    onSuccess: (paymentId: string) => void
    onCancel: () => void
}

export default function MPPaymentBrick({ plan, billingCycle, storeId, onSuccess, onCancel }: MPPaymentBrickProps) {
    const amount = billingCycle === 'annual' ? plan.annual_price : plan.price;
    const initialization = {
        amount,
    }

    // El SDK de MercadoPago no exporta IPaymentBrickCustomization en todas las versiones
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customization: any = {
        paymentMethods: {
            ticket: 'all',
            bankTransfer: 'all',
            creditCard: 'all',
            debitCard: 'all',
            mercadoPago: ['all'],
        },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
        return new Promise((resolve, reject) => {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    formData,
                    planId: plan.id,
                    billingCycle,
                    amount,
                    storeId: storeId
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.status === 'approved') {
                        onSuccess(data.id)
                        resolve(data)
                    } else {
                        showToast('error', `Pago ${data.status}: ${data.detail || 'Rechazado'}`)
                        reject()
                    }
                })
                .catch((error) => {
                    console.error('Error enviando pago:', error)
                    showToast('error', 'Error de conexión con el servidor.')
                    reject()
                })
        })
    }

    const onError = (error: unknown) => {
        console.error('Error Brick:', error)
        showToast('error', 'Error al cargar la pasarela de pagos.')
    }

    const onReady = () => {
        console.log('Brick is ready')
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-600">Plan: {plan.name} ({billingCycle === 'monthly' ? 'Mensual' : 'Anual'})</span>
                <span className="text-lg font-black text-indigo-600">${amount}</span>
            </div>

            <Payment
                initialization={initialization}
                customization={customization}
                onSubmit={onSubmit}
                onReady={onReady}
                onError={onError}
            />

            <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">o</span>
                <div className="flex-1 h-px bg-slate-200" />
            </div>

            <a
                href={`https://wa.me/5491165689145?text=${encodeURIComponent(`Hola! Quiero suscribirme al plan VENDEx ${plan.name} (${billingCycle === 'monthly' ? 'Mensual' : 'Anual'}) - USD $${amount}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] py-3.5 rounded-2xl transition-colors shadow-lg shadow-emerald-100"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Suscribirme por WhatsApp
            </a>

            <button
                onClick={onCancel}
                className="w-full mt-1 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors py-2"
            >
                Cancelar y volver
            </button>
        </div>
    )
}
