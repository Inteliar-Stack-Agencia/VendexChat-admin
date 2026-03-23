import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const billingApi = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlans: async (): Promise<any[]> => {
        return [
            { id: 'free', name: 'Free', description: 'Empezá gratis y digitalizá tu negocio en minutos.', price: 0, annual_price: 0, features: ['2 Categorías', '10 Productos por cat.', 'Menú Digital QR', 'Pedidos por WhatsApp'] },
            { id: 'pro', name: 'Premium (Pro)', description: 'Todo lo que necesitás para crecer y vender más. Incluye Asistente de Ventas IA.', price: 13.99, annual_price: 139.9, features: ['Categorías Ilimitadas', 'Productos Ilimitados', 'Dominios Personalizados', 'Estadísticas de Venta', 'Importador de Productos con IA'], is_popular: true },
            { id: 'vip', name: 'VIP (Business)', description: 'Automatizá tu operación con IA, logística y soporte dedicado.', price: 19.99, annual_price: 199.9, features: ['Todo lo del plan Pro', 'VENDEx Bot con IA', 'Logística Integrada', 'CRM con IA & Analítica', 'Soporte Prioritario'] },
            { id: 'ultra', name: 'ULTRA', description: 'Solución empresarial a medida con infraestructura propia.', price: 0, annual_price: 0, features: ['Desarrollo a Medida', 'Web & Hosting Propio', 'Bots & Automatizaciones', 'Consultoría Estratégica', 'Soporte 24/7 VIP'] },
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
