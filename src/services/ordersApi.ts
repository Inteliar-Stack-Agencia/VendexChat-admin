import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { Order, OrderStatus } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeOrder = (data: any): Order => {
    const { order_items, ...rest } = data || {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (order_items || []).map((it: any) => {
        const { products, product_name, ...itemRest } = it
        return {
            ...itemRest,
            product_name: product_name || products?.name || 'Producto',
        }
    })
    return { ...rest, items } as Order
}

export const ordersApi = {
    list: async (params?: { status?: string; page?: number; limit?: number }) => {
        const storeId = await getStoreId()

        let query = supabase.from('orders').select('*, order_items(notes, subtotal)', { count: 'exact' }).eq('store_id', storeId)
        if (params?.status && params.status !== 'all') query = query.eq('status', params.status)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((params as any)?.date_from) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            query = query.gte('created_at', (params as any).date_from + 'T00:00:00')
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((params as any)?.date_to) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            query = query.lte('created_at', (params as any).date_to + 'T23:59:59')
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((params as any)?.customer_search) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            query = query.ilike('customer_name', `%${(params as any).customer_search}%`)
        }

        const from = ((params?.page || 1) - 1) * (params?.limit || 10)
        const to = from + (params?.limit || 10) - 1

        const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
        if (error) throw error

        return {
            data: (data || []).map(normalizeOrder),
            total: count || 0,
            page: params?.page || 1,
            limit: params?.limit || 10,
            total_pages: Math.ceil((count || 0) / (params?.limit || 10))
        }
    },

    get: async (id: string | number) => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*, products(name))')
            .eq('id', id)
            .single()
        if (error) throw error
        return normalizeOrder(data)
    },

    updateStatus: async (id: string | number, status: OrderStatus) => {
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select('*, order_items(*, products(name))')
            .single()
        if (error) throw error
        return normalizeOrder(data)
    },

    updateMetadata: async (id: string | number, metadata: Record<string, unknown>) => {
        const { data, error } = await supabase
            .from('orders')
            .update({ metadata })
            .eq('id', id)
            .select('*, order_items(*, products(name))')
            .single()
        if (error) throw error
        return normalizeOrder(data)
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
        items: { product_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number }[]
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
                delivery_type: order.metadata?.delivery_type || 'pickup',
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

        // Update stock: batch fetch all products, then update only those with limited stock
        const productIds = items.map(i => i.product_id).filter((id): id is string => !!id)
        const { data: products } = await supabase
            .from('products')
            .select('id, stock, unlimited_stock')
            .in('id', productIds)

        if (products) {
            await Promise.all(
                products
                    .filter(p => !p.unlimited_stock)
                    .map(p => {
                        const ordered = items.filter(i => i.product_id === p.id).reduce((acc, i) => acc + i.quantity, 0)
                        return supabase
                            .from('products')
                            .update({ stock: Math.max(0, (p.stock || 0) - ordered) })
                            .eq('id', p.id)
                    })
            )
        }

        return data as Order
    },

    // Reemplaza los items de un pedido ya creado — para cuando lo que se despachó
    // termina siendo distinto a lo pedido originalmente (cambios/agregados de último
    // momento). Recalcula subtotal/total y ajusta stock por la diferencia (no el total),
    // para no descontar dos veces lo que ya se había descontado al crear el pedido.
    updateItems: async (
        orderId: string | number,
        items: { product_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number }[],
        subtotal: number,
        total: number,
    ) => {
        const { data: oldItems, error: oldError } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', orderId)
        if (oldError) throw oldError

        const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId)
        if (deleteError) throw deleteError

        if (items.length > 0) {
            const { error: insertError } = await supabase
                .from('order_items')
                .insert(items.map(item => ({
                    order_id: orderId,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                })))
            if (insertError) throw insertError
        }

        const { data, error: updateError } = await supabase
            .from('orders')
            .update({ subtotal, total })
            .eq('id', orderId)
            .select('*, order_items(*, products(name))')
            .single()
        if (updateError) throw updateError

        // Ajustar stock solo por la DIFERENCIA entre lo viejo y lo nuevo — un producto que
        // ya estaba en el pedido y sigue con la misma cantidad no debe tocarse.
        const oldQtyByProduct: Record<string, number> = {}
        for (const oi of oldItems || []) {
            if (!oi.product_id) continue
            oldQtyByProduct[oi.product_id] = (oldQtyByProduct[oi.product_id] || 0) + oi.quantity
        }
        const newQtyByProduct: Record<string, number> = {}
        for (const item of items) {
            if (!item.product_id) continue
            newQtyByProduct[item.product_id] = (newQtyByProduct[item.product_id] || 0) + item.quantity
        }
        const affectedProductIds = [...new Set([...Object.keys(oldQtyByProduct), ...Object.keys(newQtyByProduct)])]
        if (affectedProductIds.length > 0) {
            const { data: affectedProducts } = await supabase
                .from('products')
                .select('id, stock, unlimited_stock')
                .in('id', affectedProductIds)
            if (affectedProducts) {
                await Promise.all(
                    affectedProducts
                        .filter(p => !p.unlimited_stock)
                        .map(p => {
                            const delta = (oldQtyByProduct[p.id] || 0) - (newQtyByProduct[p.id] || 0)
                            if (delta === 0) return Promise.resolve(null)
                            return supabase
                                .from('products')
                                .update({ stock: Math.max(0, (p.stock || 0) + delta) })
                                .eq('id', p.id)
                        })
                )
            }
        }

        return normalizeOrder(data)
    },

    remove: async (id: string | number) => {
        const { error: itemsError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', id)
        if (itemsError) throw itemsError

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id)
        if (error) throw error
    },
}
