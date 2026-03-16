import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { Order, OrderStatus } from '../types'

export const ordersApi = {
    list: async (params?: { status?: string; page?: number; limit?: number }) => {
        const storeId = await getStoreId()

        let query = supabase.from('orders').select('*', { count: 'exact' }).eq('store_id', storeId)
        if (params?.status && params.status !== 'all') query = query.eq('status', params.status)

        if ((params as any)?.date_from) {
            query = query.gte('created_at', (params as any).date_from + 'T00:00:00')
        }
        if ((params as any)?.date_to) {
            query = query.lte('created_at', (params as any).date_to + 'T23:59:59')
        }

        const from = ((params?.page || 1) - 1) * (params?.limit || 10)
        const to = from + (params?.limit || 10) - 1

        const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
        if (error) throw error

        return {
            data: data as Order[],
            total: count || 0,
            page: params?.page || 1,
            limit: params?.limit || 10,
            total_pages: Math.ceil((count || 0) / (params?.limit || 10))
        }
    },

    get: async (id: string | number) => {
        const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single()
        if (error) throw error
        return data as Order
    },

    updateStatus: async (id: string | number, status: OrderStatus) => {
        const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single()
        if (error) throw error
        return data as Order
    },

    updateMetadata: async (id: string | number, metadata: Record<string, unknown>) => {
        const { data, error } = await supabase
            .from('orders')
            .update({ metadata })
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data as Order
    },

    create: async (order: {
        customer_name: string
        customer_whatsapp?: string
        customer_address?: string
        customer_notes?: string
        subtotal: number
        delivery_cost?: number
        total: number
        status?: OrderStatus
        metadata?: Record<string, unknown>
        items: { product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[]
    }) => {
        const storeId = await getStoreId()

        // Generate order number
        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
        const orderNumber = `POS-${String((count || 0) + 1).padStart(4, '0')}`

        const { items, ...orderData } = order
        const { data, error } = await supabase
            .from('orders')
            .insert({
                ...orderData,
                store_id: storeId,
                order_number: orderNumber,
                status: order.status || 'completed',
                delivery_cost: order.delivery_cost || 0,
                customer_whatsapp: order.customer_whatsapp || '',
            })
            .select()
            .single()
        if (error) throw error

        // Insert order items
        if (items.length > 0) {
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(items.map(item => ({
                    order_id: data.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                })))
            if (itemsError) throw itemsError
        }

        // Update stock for each product
        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('stock, unlimited_stock')
                .eq('id', item.product_id)
                .single()
            if (product && !product.unlimited_stock) {
                await supabase
                    .from('products')
                    .update({ stock: Math.max(0, (product.stock || 0) - item.quantity) })
                    .eq('id', item.product_id)
            }
        }

        return data as Order
    },

    remove: async (id: string | number) => {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id)
        if (error) throw error
    },
}
