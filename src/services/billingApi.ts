import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export interface Plan {
    id: string
    name: string
    price_usd: number
    annual_price_usd: number
    features: string[]
    is_active: boolean
    sort_order: number
    updated_at: string
}

// Static metadata that doesn't change with pricing
const PLAN_META: Record<string, { description: string; is_popular?: boolean }> = {
    free:  { description: 'Empezá gratis y digitalizá tu negocio en minutos.' },
    pro:   { description: 'Todo lo que necesitás para crecer y vender más. Incluye Asistente de Ventas IA.', is_popular: true },
    vip:   { description: 'Automatizá tu operación con IA, logística y soporte dedicado.' },
    ultra: { description: 'Solución empresarial a medida con infraestructura propia.' },
}

export const billingApi = {
    getPlans: async () => {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order')

        if (error) throw error

        return (data as Plan[]).map(plan => ({
            ...plan,
            // Map DB columns to the shape the UI expects
            price: plan.price_usd,
            annual_price: plan.annual_price_usd,
            ...(PLAN_META[plan.id] ?? {}),
        }))
    },

    getCurrentSubscription: async () => {
        const storeId = await getStoreId()
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('store_id', storeId)
            .maybeSingle()

        if (error) {
            console.error('Error fetching subscription:', error)
            throw error
        }

        if (!data) {
            return {
                plan_type: 'free',
                status: 'active',
                billing_cycle: 'monthly',
                current_period_end: null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
        }

        return data
    },

    createCheckoutSession: async (planId: string) => {
        const storeId = await getStoreId()
        console.log(`Iniciando checkout para el plan ${planId} en la tienda ${storeId}`)
        return { checkout_url: 'https://checkout.vendexchat.app/mock-session' }
    }
}
