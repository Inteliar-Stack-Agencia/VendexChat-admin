import { supabase } from '../supabaseClient'
import type { Tenant, RecentActivity, GatewayConfig, GlobalStats, StoreStatEntry, Subscription } from '../types'

export const superadminApi = {
    overview: async (): Promise<{
        total_stores: number;
        active_stores: number;
        new_stores_7d: number;
        mrr_estimated: number;
        recent_activity: RecentActivity[];
        failed_payments: number;
        pending_actions: number;
    }> => {
        const { count: totalStores } = await supabase.from('stores').select('*', { count: 'exact', head: true })

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { count: newStores } = await supabase
            .from('stores')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString())

        const { count: activeStores } = await supabase
            .from('stores')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)

        const { data: activeSubs } = await supabase
            .from('subscriptions')
            .select('plan_type')
            .eq('status', 'active')

        const mrr = activeSubs?.reduce((acc, sub) => {
            const price = sub.plan_type === 'premium' ? 35 : sub.plan_type === 'pro' ? 15 : sub.plan_type === 'vip' ? 25 : 0
            return acc + price
        }, 0) || 0

        const { data: recentStores } = await supabase
            .from('stores')
            .select('name, created_at, is_active')
            .order('created_at', { ascending: false })
            .limit(5)

        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
        const { count: pendingTrials } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'trial')
            .lte('current_period_end', threeDaysFromNow.toISOString())

        return {
            total_stores: totalStores || 0,
            active_stores: activeStores || 0,
            new_stores_7d: newStores || 0,
            mrr_estimated: mrr,
            recent_activity: recentStores || [],
            failed_payments: 0,
            pending_actions: pendingTrials || 0
        }
    },

    listTenants: async (params?: { q?: string; status?: string; plan?: string; page?: number; limit?: number }) => {
        let query = supabase.from('stores').select('*', { count: 'exact' })

        if (params?.q) query = query.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%`)
        if (params?.status && params.status !== 'all') query = query.eq('is_active', params.status === 'active')

        const from = ((params?.page || 1) - 1) * (params?.limit || 10)
        const to = from + (params?.limit || 10) - 1

        const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
        if (error) throw error

        return {
            data: data as Tenant[],
            total: count || 0,
            page: params?.page || 1,
            total_pages: Math.ceil((count || 0) / (params?.limit || 10))
        }
    },

    getTenant: async (id: string | number) => {
        const { data, error } = await supabase.from('stores').select('*').eq('id', id).single()
        if (error) throw error
        return data as Tenant
    },

    updateTenant: async (id: string | number, data: Partial<Tenant>) => {
        const { data: updated, error } = await supabase.from('stores').update(data).eq('id', id).select().single()
        if (error) throw error
        return updated as Tenant
    },

    deleteTenant: async (id: string | number) => {
        await supabase.from('profiles').update({ store_id: null }).eq('store_id', id)

        const { data: orders } = await supabase.from('orders').select('id').eq('store_id', id)
        if (orders && orders.length > 0) {
            const orderIds = orders.map(o => o.id)
            await supabase.from('order_items').delete().in('order_id', orderIds)
            await supabase.from('orders').delete().in('id', orderIds)
        }

        await supabase.from('products').delete().eq('store_id', id)
        await supabase.from('categories').delete().eq('store_id', id)
        await supabase.from('subscriptions').delete().eq('store_id', id)
        await supabase.from('gateways').delete().eq('store_id', id)
        await supabase.from('coupons').delete().eq('store_id', id)

        try {
            await supabase.from('sliders').delete().eq('store_id', id)
            await supabase.from('popups').delete().eq('store_id', id)
            await supabase.from('crm_contacts').delete().eq('store_id', id)
        } catch (e) {
            console.warn('Tablas opcionales no encontradas o sin permisos:', e)
        }

        const { error } = await supabase.from('stores').delete().eq('id', id)
        if (error) throw error
    },

    createTenant: async (data: { name: string; slug: string; email: string; country?: string; is_active?: boolean; password?: string; whatsapp?: string; plan_type?: string }) => {
        const { data: existingProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', data.email)
            .maybeSingle()

        let authUserId: string | null = existingProfiles?.id || null

        if (!authUserId) {
            const { createTempClient } = await import('../supabaseClient')
            const tempClient = createTempClient()

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: data.email,
                password: data.password || Math.random().toString(36).slice(-12),
                options: {
                    data: {
                        name: data.name,
                        slug: data.slug,
                        whatsapp: data.whatsapp || '',
                        role: 'client'
                    }
                }
            })

            if (authError) {
                if (!authError.message.toLowerCase().includes('already registered')) {
                    throw authError
                }
            }
            authUserId = authData.user?.id || null
        }

        let storeId: string | null = null
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 500))
            const { data: store } = await supabase.from('stores').select('id').eq('slug', data.slug).single()
            if (store) {
                storeId = store.id
                break
            }
        }

        if (storeId) {
            await supabase.from('stores').update({
                country: data.country,
                is_active: data.is_active ?? true
            }).eq('id', storeId)
        } else {
            const { data: newStore, error: insertError } = await supabase.from('stores').insert({
                name: data.name,
                slug: data.slug,
                country: data.country,
                is_active: data.is_active ?? true,
                ...(authUserId ? { owner_id: authUserId } : {})
            }).select().single()
            if (insertError) throw insertError
            storeId = newStore.id
        }

        const { data: finalStore } = await supabase.from('stores').select('*').eq('id', storeId).single()

        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 15)

        await supabase.from('subscriptions').upsert({
            store_id: storeId,
            plan_type: data.plan_type || 'pro',
            status: data.plan_type ? 'active' : 'trial',
            current_period_end: trialEndDate.toISOString(),
            billing_cycle: 'monthly'
        }, { onConflict: 'store_id' })

        await supabase.from('stores').update({
            metadata: {
                ...(finalStore?.metadata || {}),
                plan_type: data.plan_type || 'pro'
            }
        }).eq('id', storeId)

        return { ...finalStore, metadata: { ...finalStore?.metadata, plan_type: data.plan_type || 'pro' } } as Tenant
    },

    listUsers: async () => {
        const { data, error } = await supabase.from('profiles').select('*, stores(name)')
        if (error) throw error
        return (data || []).map(u => ({
            ...u,
            store_name: u.stores ? (u.stores as { name: string }).name : null
        }))
    },

    createUser: async (data: Record<string, unknown>) => {
        const { data: newUser, error } = await supabase.from('profiles').insert(data).select().single()
        if (error) throw error
        return newUser
    },

    updateUser: async (id: string | number, data: Record<string, unknown>) => {
        const { data: updated, error } = await supabase.from('profiles').update(data).eq('id', id).select().single()
        if (error) throw error
        return updated
    },

    deleteUser: async (id: string | number) => {
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) throw error

        // Also remove the Supabase Auth user so they can't keep logging in
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
                await fetch('/api/delete-auth-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ userId: String(id) })
                })
            }
        } catch (e) {
            console.warn('No se pudo eliminar el usuario de Auth (continuando):', e)
        }
    },

    listGlobalOrders: async (params?: { page?: number; limit?: number }) => {
        const from = ((params?.page || 1) - 1) * (params?.limit || 20)
        const to = from + (params?.limit || 20) - 1

        const { data, error, count } = await supabase
            .from('orders')
            .select('*, stores(name)')
            .range(from, to)
            .order('created_at', { ascending: false })

        if (error) throw error
        return {
            data: (data || []).map(o => ({
                ...o,
                store_name: (o as { stores?: { name: string } }).stores?.name
            })),
            total: count || 0
        }
    },

    getGlobalStats: async (): Promise<GlobalStats> => {
        const dates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return d.toISOString().split('T')[0]
        })

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        const { data: allRecentOrders } = await supabase
            .from('orders')
            .select('total, created_at')
            .gte('created_at', fourteenDaysAgo.toISOString())

        const currentPeriodOrders = allRecentOrders?.filter(o => o.created_at >= sevenDaysAgo.toISOString()) || []
        const previousPeriodOrders = allRecentOrders?.filter(o => o.created_at < sevenDaysAgo.toISOString()) || []

        const currentRevenue = currentPeriodOrders.reduce((acc, o) => acc + (o.total || 0), 0)
        const previousRevenue = previousPeriodOrders.reduce((acc, o) => acc + (o.total || 0), 0)
        const revenue_growth = previousRevenue > 0
            ? `+${(((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)}%`
            : '+0%'

        const currentOrdersCount = currentPeriodOrders.length
        const previousOrdersCount = previousPeriodOrders.length
        const orders_growth = previousOrdersCount > 0
            ? `+${(((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100).toFixed(1)}%`
            : '+0%'

        const revenue_trend = dates.map(date => {
            const dayTotal = currentPeriodOrders
                ?.filter(o => o.created_at.startsWith(date))
                .reduce((acc, o) => acc + (o.total || 0), 0) || 0
            return { date, value: dayTotal }
        })

        const orders_trend = dates.map(date => {
            const dayCount = currentPeriodOrders?.filter(o => o.created_at.startsWith(date)).length || 0
            return { date, value: dayCount }
        })

        const { data: storeStats } = await supabase
            .from('orders')
            .select('total, store_id, stores(name)')
            .gte('created_at', sevenDaysAgo.toISOString())
            .limit(5000)

        const storeMap: Record<string, StoreStatEntry> = {}
        storeStats?.forEach((o) => {
            const id = o.store_id
            if (!id) return
            const storeJoin = o as unknown as { stores?: { name: string } }
            if (!storeMap[id]) storeMap[id] = { name: storeJoin.stores?.name ?? '', sales: 0, orders: 0 }
            storeMap[id].sales += o.total || 0
            storeMap[id].orders += 1
        })

        const top_stores = Object.values(storeMap)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5)
            .map(s => ({
                ...s,
                growth: '+12%',
                sales: `$${s.sales.toLocaleString()}`
            }))

        return {
            revenue_trend,
            orders_trend,
            top_stores,
            revenue_growth,
            orders_growth
        }
    },

    getGlobalSettings: async () => {
        const { data, error } = await supabase.from('global_settings').select('*')
        if (error) throw error
        return (data || []).reduce<Record<string, unknown>>((acc, curr) => {
            acc[curr.key] = curr.value
            return acc
        }, {})
    },

    updateGlobalSettings: async (settings: Record<string, unknown>) => {
        const updates = Object.entries(settings).map(([key, value]) => ({
            key,
            value,
            updated_at: new Date().toISOString()
        }))

        const { error } = await supabase.from('global_settings').upsert(updates)
        if (error) throw error
        return { success: true }
    },

    inviteStaff: async (email: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: 'superadmin' })
            .eq('email', email)
            .select()
            .single()

        if (error) throw new Error('El usuario debe estar registrado primero para ser promovido a superadmin.')
        return data
    },

    connectGateway: async (provider: string, config: GatewayConfig, isMaster: boolean = false) => {
        const { data, error } = await supabase
            .from('gateways')
            .upsert({
                provider,
                config,
                is_master: isMaster,
                store_id: isMaster ? null : await (async () => {
                    const { data: profile } = await supabase.from('profiles').select('store_id').single();
                    return profile?.store_id;
                })()
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    listGateways: async (isMaster: boolean = false) => {
        let query = supabase.from('gateways').select('*')
        if (isMaster) {
            query = query.eq('is_master', true)
        } else {
            query = query.eq('is_master', false)
        }

        const { data, error } = await query
        if (error) throw error
        return data
    },

    listTenantGateways: async (storeId: string) => {
        const { data, error } = await supabase
            .from('gateways')
            .select('*')
            .eq('store_id', storeId)
            .eq('is_master', false)

        if (error) throw error
        return data || []
    },

    connectTenantGateway: async (storeId: string, provider: string, config: GatewayConfig) => {
        const { data, error } = await supabase
            .from('gateways')
            .upsert({
                store_id: storeId,
                provider,
                config,
                is_master: false
            }, { onConflict: 'store_id,provider,is_master' })
            .select()
            .single()

        if (error) throw error
        return data
    },

    disconnectTenantGateway: async (gatewayId: string) => {
        const { error } = await supabase.from('gateways').delete().eq('id', gatewayId)
        if (error) throw error
    },

    listSubscriptions: async () => {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*, stores(name)')
            .order('updated_at', { ascending: false })

        if (error) throw error
        return (data || []).map(s => ({
            ...s,
            store_name: (s as unknown as { stores?: { name: string } }).stores?.name
        }))
    },

    dashboard: async () => superadminApi.overview(),

    impersonate: async (storeId: string) => {
        localStorage.setItem('vendexchat_impersonated_store', storeId)
        window.location.href = '/dashboard'
    },

    stopImpersonation: async () => {
        localStorage.removeItem('vendexchat_impersonated_store')
        window.location.href = '/sa/overview'
    },

    updateSubscription: async (storeId: string, data: Partial<Subscription>) => {
        const { data: updated, error } = await supabase
            .from('subscriptions')
            .upsert({ store_id: storeId, ...data }, { onConflict: 'store_id' })
            .select()
            .single()
        if (error) throw error
        return updated
    },

    cloneTenant: async (sourceId: string, data: { name: string; slug: string; email: string }) => {
        const { data: sourceStore, error: sourceError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', sourceId)
            .single()

        if (sourceError || !sourceStore) throw new Error('No se pudo encontrar la tienda origen')

        const newStore = await superadminApi.createTenant({
            name: data.name,
            slug: data.slug,
            email: data.email,
            country: sourceStore.country || 'Argentina',
            is_active: true,
            plan_type: sourceStore.metadata?.plan_type || 'free'
        })

        await supabase
            .from('stores')
            .update({
                owner_id: sourceStore.owner_id,
                email: data.email || sourceStore.email,
                logo_url: sourceStore.logo_url,
                banner_url: sourceStore.banner_url,
                description: sourceStore.description,
                whatsapp: sourceStore.whatsapp || '',
                address: sourceStore.address,
                primary_color: sourceStore.primary_color,
                metadata: sourceStore.metadata,
                physical_schedule: sourceStore.physical_schedule,
                online_schedule: sourceStore.online_schedule,
                delivery_cost: sourceStore.delivery_cost,
                delivery_info: sourceStore.delivery_info
            })
            .eq('id', newStore.id)

        const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .eq('store_id', sourceId)

        if (categories && categories.length > 0) {
            for (const cat of categories) {
                const { data: newCat, error: catError } = await supabase
                    .from('categories')
                    .insert({
                        store_id: newStore.id,
                        name: cat.name,
                        sort_order: cat.sort_order
                    })
                    .select()
                    .single()

                if (!catError && newCat) {
                    const { data: products } = await supabase
                        .from('products')
                        .select('*')
                        .eq('category_id', cat.id)

                    if (products && products.length > 0) {
                        const productsToInsert = products.map(p => ({
                            store_id: newStore.id,
                            category_id: newCat.id,
                            name: p.name,
                            description: p.description,
                            price: p.price,
                            stock: p.stock,
                            unlimited_stock: p.unlimited_stock,
                            image_url: p.image_url,
                            is_active: p.is_active,
                            is_featured: p.is_featured,
                            sort_order: p.sort_order
                        }))
                        await supabase.from('products').insert(productsToInsert)
                    }
                }
            }
        }

        const { data: sourceSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('store_id', sourceId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (sourceSub) {
            await supabase
                .from('subscriptions')
                .insert({
                    store_id: newStore.id,
                    plan_type: sourceSub.plan_type,
                    status: sourceSub.status,
                    current_period_start: sourceSub.current_period_start,
                    current_period_end: sourceSub.current_period_end,
                    billing_cycle: sourceSub.billing_cycle,
                })
        }

        return newStore
    }
}
