import { initMercadoPago, Payment } from '@mercadopago/sdk-react'
import { SubscriptionPlan } from '../../types'
import { showToast } from '../common/Toast'

// Inicializar con la Public Key del .env
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY)

interface MPPaymentBrickProps {
    plan: SubscriptionPlan
    storeId: string
    onSuccess: (paymentId: string) => void
    onCancel: () => void
}

export default function MPPaymentBrick({ plan, storeId, onSuccess, onCancel }: MPPaymentBrickProps) {
    const initialization = {
        amount: plan.price,
    }

    const customization: any = {
        paymentMethods: {
            ticket: 'all',
            bankTransfer: 'all',
            creditCard: 'all',
            debitCard: 'all',
            mercadoPago: ['all'],
        },
    }

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

    const onError = (error: any) => {
        console.error('Error Brick:', error)
        showToast('error', 'Error al cargar la pasarela de pagos.')
    }

    const onReady = () => {
        console.log('Brick is ready')
    }

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-600">Plan: {plan.name}</span>
                <span className="text-lg font-black text-indigo-600">${plan.price}</span>
            </div>

            <Payment
                initialization={initialization}
                customization={customization}
                onSubmit={onSubmit}
                onReady={onReady}
                onError={onError}
            />

            <button
                onClick={onCancel}
                className="w-full mt-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors py-2"
            >
                Cancelar y volver
            </button>
        </div>
    )
}
