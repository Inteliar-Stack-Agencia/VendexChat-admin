import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export const customersApi = {
    list: async (params?: { page?: number; limit?: number; search?: string; archived?: boolean }) => {
        const storeId = await getStoreId()
        const limit = params?.limit || 50
        const page = params?.page || 1

        let query = supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .eq('store_id', storeId)

        // Filter by archived status
        if (params?.archived) {
            query = query.eq('is_archived', true)
        }

        if (params?.search) {
            query = query.or(`name.ilike.%${params.search}%,whatsapp.ilike.%${params.search}%`)
        }

        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data, error, count } = await query
            .range(from, to)
            .order('last_order_at', { ascending: false })

        if (error) throw error

        return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit)
        }
    },

    get: async (id: string) => {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single()
        if (error) throw error
        return data
    },

    updateNotes: async (id: string, notes: string) => {
        const { data, error } = await supabase
            .from('customers')
            .update({ notes })
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data
    },

    // Notas médicas/dieta (separadas de las notas internas genéricas) + flag de
    // seguimiento nutricional activo, para clientes con requerimientos especiales.
    updateDietaryInfo: async (id: string, data: { dietary_notes: string; needs_diet_tracking: boolean }) => {
        const { data: updated, error } = await supabase
            .from('customers')
            .update(data)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return updated
    },

    // Platos consumidos por un cliente (cruza pedidos por WhatsApp con sus ítems),
    // agrupados por producto con la cantidad de veces pedido y la fecha más reciente —
    // para detectar qué se repite demasiado y sugerir variantes.
    getDishHistory: async (whatsapp: string): Promise<{ product_id: string | null; product_name: string; timesOrdered: number; totalQuantity: number; lastOrderedAt: string }[]> => {
        const storeId = await getStoreId()
        const clean = whatsapp.replace(/\D/g, '')
        const { data, error } = await supabase
            .from('orders')
            .select('created_at, order_items(product_id, product_name, quantity)')
            .eq('store_id', storeId)
            .ilike('customer_whatsapp', `%${clean}%`)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
        if (error) throw error

        const byProduct = new Map<string, { product_id: string | null; product_name: string; timesOrdered: number; totalQuantity: number; lastOrderedAt: string }>()
        for (const order of (data || []) as unknown as { created_at: string; order_items: { product_id: string | null; product_name: string; quantity: number }[] }[]) {
            for (const item of order.order_items || []) {
                const key = item.product_id || item.product_name
                const existing = byProduct.get(key)
                if (existing) {
                    existing.timesOrdered += 1
                    existing.totalQuantity += item.quantity
                    if (order.created_at > existing.lastOrderedAt) existing.lastOrderedAt = order.created_at
                } else {
                    byProduct.set(key, {
                        product_id: item.product_id,
                        product_name: item.product_name,
                        timesOrdered: 1,
                        totalQuantity: item.quantity,
                        lastOrderedAt: order.created_at,
                    })
                }
            }
        }
        return Array.from(byProduct.values()).sort((a, b) => b.timesOrdered - a.timesOrdered)
    },

    archive: async (id: string, archived: boolean) => {
        const { data, error } = await supabase
            .from('customers')
            .update({ is_archived: archived })
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return data
    },

    remove: async (id: string) => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
        if (error) throw error
    },

    create: async (data: { name: string; whatsapp?: string; email?: string; notes?: string }) => {
        const storeId = await getStoreId()
        const { data: created, error } = await supabase
            .from('customers')
            .insert({
                store_id: storeId,
                name: data.name.trim(),
                whatsapp: data.whatsapp?.trim() || '',
                email: data.email?.trim() || null,
                notes: data.notes?.trim() || null,
            })
            .select()
            .single()
        if (error) throw error
        return created
    },

    getOrdersByWhatsapp: async (whatsapp: string) => {
        const storeId = await getStoreId()
        const clean = whatsapp.replace(/\D/g, '')
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, total, status, created_at')
            .eq('store_id', storeId)
            .ilike('customer_whatsapp', `%${clean}%`)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
    }
}
