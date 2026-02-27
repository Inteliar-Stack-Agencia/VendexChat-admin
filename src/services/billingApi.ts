import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const billingApi = {
    getPlans: async (): Promise<any[]> => {
        return [
            { id: 'free', name: 'Free', price: 0, annual_price: 0, features: ['2 Categorías', '10 Productos por cat.', 'Menú Digital QR', 'Pedidos por WhatsApp'] },
            { id: 'pro', name: 'Premium (Pro)', price: 9.99, annual_price: 99.90, features: ['Categorías Ilimitadas', 'Productos Ilimitados', 'Dominios Personalizados', 'Estadísticas de Venta', 'Exportar a Excel'], is_popular: true },
            { id: 'vip', name: 'VIP (Business)', price: 14.99, annual_price: 149.90, features: ['Todo lo anterior Pro', 'VENDEx Bot (Beta)', 'Logística Integrada', 'Control de Stock Avanzado', 'Soporte Prioritario'] },
            { id: 'ultra', name: 'ULTRA', price: 0, annual_price: 0, features: ['Desarrollo a Medida', 'Web & Hosting Propio', 'Bots & Automatizaciones', 'Consultoría Estratégica', 'Soporte 24/7 VIP'] },
        ]
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
