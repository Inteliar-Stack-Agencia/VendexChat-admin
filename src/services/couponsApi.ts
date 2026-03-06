import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { Coupon, CouponFormData } from '../types'

export const couponsApi = {
    list: async () => {
        const storeId = await getStoreId()
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Coupon[]
    },

    get: async (id: string) => {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data as Coupon
    },

    create: async (data: CouponFormData) => {
        const storeId = await getStoreId()
        const { data: newCoupon, error } = await supabase
            .from('coupons')
            .insert({
                ...data,
                store_id: storeId,
                value: Number(data.value),
                min_purchase_amount: Number(data.min_purchase_amount || 0),
                usage_limit: data.usage_limit ? Number(data.usage_limit) : null,
                end_date: data.end_date || null
            })
            .select()
            .single()

        if (error) throw error
        return newCoupon as Coupon
    },

    update: async (id: string, data: Partial<CouponFormData>) => {
        const updateData: Partial<CouponFormData> = { ...data }
        if (data.value) updateData.value = Number(data.value)
        if (data.min_purchase_amount !== undefined) updateData.min_purchase_amount = Number(data.min_purchase_amount)
        if (data.usage_limit !== undefined) (updateData as { usage_limit?: number | string | null }).usage_limit = data.usage_limit ? Number(data.usage_limit) : null

        const { data: updated, error } = await supabase
            .from('coupons')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return updated as Coupon
    },

    delete: async (id: string) => {
        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    toggleGlobal: async (enabled: boolean) => {
        const storeId = await getStoreId()
        const { error } = await supabase
            .from('stores')
            .update({ coupons_enabled: enabled })
            .eq('id', storeId)

        if (error) throw error
    }
}
