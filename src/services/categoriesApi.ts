import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { Category } from '../types'

export const categoriesApi = {
    list: async () => {
        const storeId = await getStoreId()

        const { data, error } = await supabase
            .from('categories')
            .select('*, products(count)')
            .eq('store_id', storeId)
            .order('sort_order', { ascending: true })

        if (error) throw error
        return (data || []).map(cat => ({
            ...cat,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            product_count: (cat as any).products?.[0]?.count || 0
        })) as Category[]
    },

    create: async (data: { name: string; sort_order?: number }) => {
        const storeId = await getStoreId()

        const { data: newCat, error } = await supabase.from('categories').insert({
            ...data,
            store_id: storeId
        }).select().single()

        if (error) {
            console.error('Supabase error creating category:', error)
            throw new Error(`Error BD: ${error.message}`)
        }
        return newCat as Category
    },

    update: async (id: string | number, data: { name?: string; sort_order?: number }) => {
        const { data: updatedCat, error } = await supabase.from('categories').update(data).eq('id', id).select().single()
        if (error) throw error
        return updatedCat as Category
    },

    deleteCategory: async (id: string | number) => {
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) throw error
    },
}
