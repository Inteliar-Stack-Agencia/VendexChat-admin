// ========================================
// VENDExChat Admin - Servicio Supabase
// ========================================

import { supabase } from '../supabaseClient'
import type {
  Product,
  ProductFormData,
  Category,
  Order,
  OrderStatus,
  Tenant,
  User
} from '../types'

/**
 * Utilidad para obtener el store_id del usuario actual con lógica de "Auto-reparación"
 * Si el perfil no tiene store_id, intenta encontrar la tienda por el slug en los metadatos de auth.
 */
export const getStoreId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('getStoreId: No hay sesión activa')
    throw new Error('No hay sesión activa')
  }

  // 1. Intentar por perfil
  const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()

  if (profile?.store_id) {
    return profile.store_id
  }

  console.warn('getStoreId: Store ID no encontrado en perfil, intentando auto-reparación...')

  // 2. Auto-reparación: Si no tiene store_id, buscar por slug en metadatos
  const metaSlug = user.user_metadata?.slug
  if (metaSlug) {
    const { data: store } = await supabase.from('stores').select('id').eq('slug', metaSlug).single()
    if (store) {
      console.log('getStoreId: Tienda encontrada por slug, vinculando perfil...', store.id)
      // Vincular permanentemente para futuras llamadas
      const { error: updateError } = await supabase.from('profiles').update({ store_id: store.id }).eq('id', user.id)
      if (updateError) {
        console.error('getStoreId: Error al actualizar perfil con store_id:', updateError)
        // Aun así devolvemos el ID para que la petición actual funcione si es posible
      }
      return store.id
    } else {
      console.error('getStoreId: No se encontró tienda con slug:', metaSlug)
    }
  } else {
    console.warn('getStoreId: Usuario no tiene slug en metadata')
  }

  throw new Error('Error al identificar la tienda (store_id ausente)')
}

// --- Auth ---
export const authApi = {
  login: async (email: string, _password: string) => {
    // Nota: El login ahora se maneja vía Supabase Auth
    // Esta función es un placeholder para compatibilidad o login manual si fuera necesario
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: _password })
    if (error) throw error
    return { token: data.session?.access_token || '', user: data.user as unknown as User }
  },

  register: async (data: { store_name: string; email: string; password: string; slug: string }) => {
    // 1. Crear usuario en Auth con metadatos para el trigger de profiles
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.store_name,
          slug: data.slug,
          whatsapp: '', // Nuevo: Para evitar el error de not-null en la tabla stores
          role: 'client'
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario')

    // 2. Nota: Ya no creamos la tienda desde aquí para evitar el error RLS (400).
    // La tienda se creará automáticamente en Postgres mediante un trigger.

    return {
      token: authData.session?.access_token || '',
      user: authData.user as unknown as User
    }
  },

  me: async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) throw authError || new Error('No auth user')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, stores(*)')
      .eq('id', authUser.id)
      .single()

    if (profileError) throw profileError

    return {
      user: {
        ...authUser,
        role: profile.role,
        tenant_id: profile.store_id, // Mapeo para compatibilidad con tipos viejos
        store_id: profile.store_id,
        store: profile.stores
      } as unknown as User
    }
  },

  signOut: () => supabase.auth.signOut(),

  requestPasswordReset: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return { message: 'Se ha enviado un correo para restablecer tu contraseña' }
  },

  resetPassword: async (_token: string, password: string) => {
    // Nota: El token lo maneja Supabase Auth automáticamente si el usuario llega vía link
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    return { message: 'Contraseña actualizada correctamente' }
  },

  changePassword: async (_currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return { message: 'Contraseña cambiada correctamente' }
  },
}

// --- Dashboard ---
export const dashboardApi = {
  getStats: async (): Promise<any> => {
    const storeId = await getStoreId()

    if (!storeId) return { orders_today: 0, sales_today: 0, active_products: 0, recent_orders: [], low_stock_products: [] }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Pedidos de hoy
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', today.toISOString())

    // 2. Ventas hoy (Suma de totales)
    const { data: salesData } = await supabase
      .from('orders')
      .select('total')
      .eq('store_id', storeId)
      .eq('status', 'completed') // Solo sumamos las entregadas/pagadas
      .gte('created_at', today.toISOString())

    const salesToday = salesData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0

    // 3. Productos activos totales
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)

    // 4. Últimos 5 pedidos (con detalles)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(5)

    // 5. Alertas de stock bajo (< 5 unidades)
    const { data: lowStock } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .lt('stock', 5)
      .order('stock', { ascending: true })

    return {
      orders_today: ordersCount || 0,
      sales_today: salesToday,
      active_products: productsCount || 0,
      recent_orders: recentOrders || [],
      low_stock_products: lowStock || []
    }
  }
}

// --- Productos ---
export const productsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; category_id?: number | string }) => {
    const storeId = await getStoreId()

    let query = supabase.from('products').select('*, categories(name)', { count: 'exact' }).eq('store_id', storeId)

    if (params?.search) query = query.ilike('name', `%${params.search}%`)
    if (params?.category_id) query = query.eq('category_id', params.category_id)

    const from = ((params?.page || 1) - 1) * (params?.limit || 10)
    const to = from + (params?.limit || 10) - 1

    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
    if (error) throw error

    return {
      data: (data || []).map(p => ({
        ...p,
        category_name: (p as any).categories?.name
      })) as Product[],
      total: count || 0,
      page: params?.page || 1,
      limit: params?.limit || 10,
      total_pages: Math.ceil((count || 0) / (params?.limit || 10))
    }
  },

  get: async (id: string | number) => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (error) throw error
    return data as Product
  },

  create: async (data: ProductFormData) => {
    const storeId = await getStoreId()

    const { data: newProd, error } = await supabase.from('products').insert({
      ...data,
      store_id: storeId,
      price: Number(data.price),
      stock: Number(data.stock),
      category_id: data.category_id || null
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
    const updateData: any = { ...data }
    if (data.price) updateData.price = typeof data.price === 'string' ? parseFloat(data.price) : data.price
    if (data.stock) updateData.stock = typeof data.stock === 'string' ? parseInt(data.stock) : data.stock

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
}

// --- Categorías ---
export const categoriesApi = {
  list: async () => {
    const storeId = await getStoreId()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name')

    if (error) throw error
    return data as Category[]
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

// --- Pedidos ---
export const ordersApi = {
  list: async (params?: { status?: string; page?: number; limit?: number }) => {
    const storeId = await getStoreId()

    let query = supabase.from('orders').select('*', { count: 'exact' }).eq('store_id', storeId)
    if (params?.status && params.status !== 'all') query = query.eq('status', params.status)

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
}

// --- Clientes ---
export const customersApi = {
  list: async () => {
    const storeId = await getStoreId()

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .order('last_order_at', { ascending: false })

    if (error) throw error
    return data || []
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
  }
}

// --- Tenant (Configuración de la tienda) ---
export const tenantApi = {
  getMe: async () => {
    const storeId = await getStoreId()
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (!store) throw new Error('No store found for this user')
    return store as unknown as Tenant
  },

  updateMe: async (data: Partial<Tenant>) => {
    const storeId = await getStoreId()

    const { data: updated, error } = await supabase
      .from('stores')
      .update(data)
      .eq('id', storeId)
      .select()
      .single()

    if (error) throw error
    return updated as unknown as Tenant
  },

  listGateways: async () => {
    const { data: profile } = await supabase.from('profiles').select('store_id').single();
    if (!profile?.store_id) return [];

    const { data, error } = await supabase
      .from('gateways')
      .select('*')
      .eq('store_id', profile.store_id)
      .eq('is_master', false)

    if (error) throw error
    return data
  },

  connectGateway: async (provider: string, config: any) => {
    const { data: profile } = await supabase.from('profiles').select('store_id').single();
    if (!profile?.store_id) throw new Error('No store associated with this user');

    const { data, error } = await supabase
      .from('gateways')
      .upsert({
        store_id: profile.store_id,
        provider,
        config,
        is_master: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// --- Superadmin ---
export const superadminApi = {
  overview: async (): Promise<any> => {
    // 1. Total stores
    const { count: totalStores } = await supabase.from('stores').select('*', { count: 'exact', head: true })

    // 2. New stores in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count: newStores } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    // 3. Active stores
    const { count: activeStores } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // 4. MRR Estimado (Suma de precios de suscripciones activas)
    // Para simplificar, asumimos Pro = 15 y Premium = 35 si no hay tabla de planes
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('status', 'active')

    const mrr = activeSubs?.reduce((acc, sub) => {
      const price = sub.plan_type === 'premium' ? 35 : sub.plan_type === 'pro' ? 15 : 0
      return acc + price
    }, 0) || 0

    // 5. Actividad reciente (Últimas 5 tiendas)
    const { data: recentStores } = await supabase
      .from('stores')
      .select('name, created_at, is_active')
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      total_stores: totalStores || 0,
      active_stores: activeStores || 0,
      new_stores_7d: newStores || 0,
      mrr_estimated: mrr,
      recent_activity: recentStores || [],
      failed_payments: 0 // Placeholder hasta tener logs de errores de pago
    }
  },

  listTenants: async (params?: { q?: string; status?: string; plan?: string; page?: number; limit?: number }) => {
    let query = supabase.from('stores').select('*', { count: 'exact' })

    if (params?.q) query = query.or(`name.ilike.%${params.q}%,slug.ilike.%${params.q}%`)
    if (params?.status && params.status !== 'all') query = query.eq('is_active', params.status === 'active')

    // Note: 'plan' column might not exist yet, assuming 'premium' flag or similar if applicable
    // If not, we'll just handle it as a placeholder filter for now.

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

  updateTenant: async (id: string | number, data: any) => {
    const { data: updated, error } = await supabase.from('stores').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated as Tenant
  },

  deleteTenant: async (id: string | number) => {
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) throw error
  },

  createTenant: async (data: any) => {
    const { data: newTenant, error } = await supabase.from('stores').insert(data).select().single()
    if (error) throw error
    return newTenant as Tenant
  },

  listUsers: async () => {
    const { data, error } = await supabase.from('profiles').select('*, stores(name)')
    if (error) throw error
    return (data || []).map(u => ({
      ...u,
      store_name: (u as any).stores?.name
    })) as any[]
  },

  createUser: async (data: any) => {
    const { data: newUser, error } = await supabase.from('profiles').insert(data).select().single()
    if (error) throw error
    return newUser
  },

  updateUser: async (id: string | number, data: any) => {
    const { data: updated, error } = await supabase.from('profiles').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  },

  deleteUser: async (id: string | number) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) throw error
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
        store_name: (o as any).stores?.name
      })),
      total: count || 0
    }
  },

  getGlobalStats: async (): Promise<any> => {
    // Esto es un placeholder que simula datos de tendencias para los gráficos de la Fase 3
    return {
      revenue_trend: [
        { date: '2024-02-12', value: 10500 },
        { date: '2024-02-13', value: 11200 },
        { date: '2024-02-14', value: 10800 },
        { date: '2024-02-15', value: 12100 },
        { date: '2024-02-16', value: 13500 },
        { date: '2024-02-17', value: 12900 },
        { date: '2024-02-18', value: 14200 },
      ],
      orders_trend: [
        { date: '2024-02-12', value: 85 },
        { date: '2024-02-13', value: 92 },
        { date: '2024-02-14', value: 78 },
        { date: '2024-02-15', value: 104 },
        { date: '2024-02-16', value: 115 },
        { date: '2024-02-17', value: 98 },
        { date: '2024-02-18', value: 122 },
      ]
    }
  },

  updateGlobalSettings: async (settings: any) => {
    // Simulamos la persistencia de settings globales (ej. en una tabla 'config' o metadatos)
    console.log('Updating global settings:', settings)
    return { success: true }
  },

  connectGateway: async (provider: string, config: any, isMaster: boolean = false) => {
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

  dashboard: async () => superadminApi.overview()
}

// --- Facturación ---
export const billingApi = {
  getPlans: async (): Promise<any[]> => {
    // Mock de planes (estos podrían venir de una tabla 'plans' en el futuro)
    return [
      { id: 'free', name: 'Free', price: 0, features: ['Hasta 50 productos', 'Pedidos ilimitados', 'Dashboard básico'] },
      { id: 'pro', name: 'Pro', price: 15, features: ['Productos ilimitados', 'Estadísticas avanzadas', 'Soporte prioritario'], is_popular: true },
      { id: 'premium', name: 'Premium', price: 35, features: ['Marca blanca', 'Dominio personalizado', 'Integraciones VIP'] },
    ]
  },

  getCurrentSubscription: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
    return data
  },

  createCheckoutSession: async (planId: string) => {
    const storeId = await getStoreId()

    // Aquí iría la llamada a un Edge Function de Supabase o backend
    // que interactúe con la API de Stripe/MercadoPago.
    // Simulamos una respuesta exitosa.
    console.log(`Iniciando checkout para el plan ${planId} en la tienda ${storeId}`)
    return { checkout_url: 'https://checkout.vendexchat.app/mock-session' }
  }
}
