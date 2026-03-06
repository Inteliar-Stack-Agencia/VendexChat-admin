import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { Product, ProductFormData } from '../types'
import { normalizeProductData } from '../utils/helpers'

export const productsApi = {
    list: async (params?: { page?: number; limit?: number; search?: string; category_id?: number | string }) => {
        const storeId = await getStoreId()
        const limit = params?.limit || 50

        let query = supabase.from('products').select('id, name, description, price, image_url, stock, unlimited_stock, is_active, category_id, sort_order, store_id, is_featured, created_at, categories(name)', { count: 'estimated' }).eq('store_id', storeId)

        if (params?.search) query = query.ilike('name', `%${params.search}%`)
        if (params?.category_id) query = query.eq('category_id', params.category_id)

        const from = ((params?.page || 1) - 1) * limit
        const to = from + limit - 1

        const { data, error, count } = await query
            .range(from, to)
            .order('is_active', { ascending: false })
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false })

        if (error) throw error

        return {
            data: (data || []).map(p => ({
                ...p,
                category_name: (p as any).categories?.name
            })) as unknown as Product[],
            total: count || 0,
            page: params?.page || 1,
            limit: limit,
            total_pages: Math.ceil((count || 0) / limit)
        }
    },

    get: async (id: string | number) => {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
        if (error) throw error
        return data as Product
    },

    create: async (data: ProductFormData) => {
        const storeId = await getStoreId()

        const { data: lastProd } = await supabase
            .from('products')
            .select('sort_order')
            .eq('store_id', storeId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .single()

        const nextOrder = (lastProd?.sort_order || 0) + 10

        const { name, description } = normalizeProductData(data.name, data.description || '')

        const { data: newProd, error } = await supabase.from('products').insert({
            ...data,
            name,
            description,
            store_id: storeId,
            price: Number(data.price),
            stock: Number(data.stock),
            category_id: data.category_id || null,
            sort_order: nextOrder
        }).select('*, categories(name)').single()

        if (error) {
            console.error('Error al crear producto en Supabase:', error)
            throw new Error(`Error BD: ${error.message} (${error.code})`)
        }

        return {
            ...newProd,
            category_name: (newProd as any).categories?.name
        } as Product
    },

    update: async (id: string | number, data: Partial<ProductFormData>) => {
        const updateData: Partial<ProductFormData> = { ...data }

        if (data.name !== undefined || data.description !== undefined) {
            const normalized = normalizeProductData(
                data.name ?? '',
                data.description ?? ''
            )
            if (data.name !== undefined) updateData.name = normalized.name
            if (data.description !== undefined) updateData.description = normalized.description
        }

        if (data.price !== undefined) updateData.price = typeof data.price === 'string' ? parseFloat(data.price) : data.price
        if (data.stock !== undefined) updateData.stock = typeof data.stock === 'string' ? parseInt(data.stock) : data.stock

        const { data: updatedProd, error } = await supabase.from('products').update(updateData).eq('id', id).select('*, categories(name)').single()
        if (error) throw error
        return {
            ...updatedProd,
            category_name: (updatedProd as any).categories?.name
        } as Product
    },

    delete: async (id: string | number) => {
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) throw error
    },

    uploadProductImage: async (productId: string, file: File) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${productId}-${Math.random()}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath)

        await productsApi.update(productId, { image_url: publicUrl })
        return publicUrl
    },
}
