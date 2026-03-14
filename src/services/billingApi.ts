import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const billingApi = {
    getPlans: async (): Promise<any[]> => {
        return [
            { id: 'free', name: 'Free', description: 'Empezá gratis y digitalizá tu negocio en minutos.', price: 0, annual_price: 0, features: ['2 Categorías', '10 Productos por cat.', 'Menú Digital QR', 'Pedidos por WhatsApp'] },
            { id: 'pro', name: 'PRO', description: 'Todo lo que necesitás para crecer y vender más. Incluye Asistente de Ventas IA.', price: 9.99, annual_price: 99.90, features: ['Categorías Ilimitadas', 'Productos Ilimitados', 'Dominios Personalizados', 'Estadísticas de Venta', 'Importador masivo con IA: con un click cargás todos los productos a tu catálogo', 'Asistente de Ventas IA'] },
            { id: 'vip', name: 'VIP', description: 'Automatizá tu operación con IA, logística y soporte dedicado.', price: 14.99, annual_price: 149.90, features: ['Todo lo del plan Pro', 'VENDEx Bot con IA', 'Logística Integrada', 'CRM con IA & Analítica', 'Soporte Prioritario'], is_popular: true },
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
