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
  User,
  Coupon,
  CouponFormData
} from '../types'
import { normalizeProductData } from '../utils/helpers'

/**
 * Utilidad para obtener el store_id del usuario actual con lógica de "Auto-reparación"
 * Si el perfil no tiene store_id, intenta encontrar la tienda por el slug en los metadatos de auth.
 */
export const getStoreId = async (): Promise<string> => {
  console.log('[getStoreId] START')
  // 1. Prioridad Absoluta: Selección Manual o Suplantación (Sin esperas de red si es posible)
  const impersonatedId = localStorage.getItem('vendexchat_impersonated_store')
  const selectedStoreId = localStorage.getItem('vendexchat_selected_store')
  console.log('[getStoreId] Storage - Impersonated:', impersonatedId, 'Selected:', selectedStoreId)
  const activeStoreId = impersonatedId || selectedStoreId

  if (activeStoreId) {
    console.log('[api] Using ACTIVE store ID from localStorage:', activeStoreId)
    return activeStoreId
  }

  // 2. Fallback: Obtener usuario de Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('getStoreId: No hay sesión activa')
    throw new Error('No hay sesión activa')
  }

  // 3. Intentar por perfil
  const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
  if (profile?.store_id) {
    console.log('[api] Using store ID from profile:', profile.store_id)
    return profile.store_id
  }

  // 4. Auto-reparación por slug en metadata
  const metaSlug = user.user_metadata?.slug
  if (metaSlug) {
    const { data: store } = await supabase.from('stores').select('id').eq('slug', metaSlug).single()
    if (store) {
      console.log('getStoreId: Auto-vinculando perfil por slug...', store.id)
      await supabase.from('profiles').update({ store_id: store.id }).eq('id', user.id)
      return store.id
    }
  }

  throw new Error('Error al identificar la tienda (store_id ausente)')
}

// --- Auth ---
export const authApi = {
  login: async (email: string, _password: string) => {
    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: _password })
    if (authError) throw authError
    if (!authData.user) throw new Error('Usuario no encontrado')

    // 2. Fetch full profile and store
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, stores(*)')
      .eq('id', authData.user.id)
      .single()


    if (profileError) {
      console.warn('Profile not found, using auth metadata fallback')
      return {
        token: authData.session?.access_token || '',
        user: {
          ...authData.user,
          role: (authData.user.user_metadata as any)?.role || 'client'
        } as unknown as User
      }
    }


    return {
      token: authData.session?.access_token || '',
      user: {
        ...authData.user,
        role: profile.role,
        tenant_id: profile.store_id,
        store_id: profile.store_id,
        store: profile.stores
      } as unknown as User
    }
  },

  getMyStores: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const allStores: any[] = []
    const seenIds = new Set<string>()

    // 1. Buscar la tienda vinculada al perfil (SIEMPRE funciona por RLS)
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single()

    if (profile?.store_id) {
      const { data: profileStore } = await supabase
        .from('stores')
        .select('*')
        .eq('id', profile.store_id)
        .single()

      if (profileStore) {
        allStores.push(profileStore)
        seenIds.add(profileStore.id)
      }
    }

    // 2. Buscar otras tiendas con el mismo email
    if (user.email) {
      const { data: emailStores } = await supabase
        .from('stores')
        .select('*')
        .eq('email', user.email)

      if (emailStores) {
        for (const s of emailStores) {
          if (!seenIds.has(s.id)) {
            allStores.push(s)
            seenIds.add(s.id)
          }
        }
      }
    }

    // 3. Fallback: traer TODAS las tiendas visibles para el usuario
    //    (si es superadmin, o si encontramos pocas tiendas por los métodos anteriores)
    if (profile?.role === 'superadmin' || allStores.length < 2) {
      const { data: moreStores } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true })
        .limit(100)

      if (moreStores) {
        for (const s of moreStores) {
          if (!seenIds.has(s.id)) {
            allStores.push(s)
            seenIds.add(s.id)
          }
        }
      }
    }

    console.log('[getMyStores] Total:', allStores.length, allStores.map((s: any) => s.name))
    return allStores as Tenant[]
  },



  register: async (data: { store_name: string; email: string; password: string; slug: string; country: string; city: string }) => {
    // 1. Crear usuario en Auth con metadatos para el trigger de profiles
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.store_name,
          slug: data.slug,
          country: data.country,
          city: data.city,
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

    if (profileError) {
      console.warn('[api] Profile not found, using auth metadata fallback')
      return {
        user: {
          ...authUser,
          role: (authUser.user_metadata as any)?.role || 'client',
          tenant_id: (authUser.user_metadata as any)?.store_id,
          store_id: (authUser.user_metadata as any)?.store_id
        } as unknown as User
      }
    }

    return {
      user: {
        ...authUser,
        role: profile.role,
        tenant_id: profile.store_id,
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
      .select('id', { count: 'exact', head: true }) // Only need ID for count
      .eq('store_id', storeId)

    // 4. Últimos 5 pedidos (con detalles seleccionados)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, total, status, customer_name, created_at') // Avoid *
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(5)

    // 5. Umbral de stock (de la tienda)
    const { data: storeData } = await supabase
      .from('stores')
      .select('low_stock_threshold')
      .eq('id', storeId)
      .single()

    const threshold = storeData?.low_stock_threshold ?? 5

    // 6. Alertas de stock bajo (usando el umbral y campos específicos)
    const { data: lowStock } = await supabase
      .from('products')
      .select('id, name, stock, image_url') // Avoid * to skip large base64 if still present
      .eq('store_id', storeId)
      .lte('stock', threshold)
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

    // Seleccionamos campos específicos para evitar traer datos pesados (como base64) si no son necesarios
    // Si ya migramos a Storage, image_url será corto, pero por ahora somos precavidos
    let query = supabase.from('products').select('id, name, description, price, image_url, stock, is_active, category_id, unlimited_stock, sort_order, store_id, is_featured, created_at, categories(name)', { count: 'exact' }).eq('store_id', storeId)

    if (params?.search) query = query.ilike('name', `%${params.search}%`)
    if (params?.category_id) query = query.eq('category_id', params.category_id)

    const from = ((params?.page || 1) - 1) * (params?.limit || 10)
    const to = from + (params?.limit || 10) - 1

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

    // Obtener el último sort_order para agregar al final
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
    const updateData: any = { ...data }

    // Normalizar si vienen nombre o descripción
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

// --- Categorías ---
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

// --- Estadísticas ---
export const statsApi = {
  getOverview: async (range: '7d' | '30d' | 'all' = '30d') => {
    const storeId = await getStoreId()
    const query = supabase.from('orders').select('total, created_at, status').eq('store_id', storeId)

    if (range !== 'all') {
      const days = range === '7d' ? 7 : 30
      const date = new Date()
      date.setDate(date.getDate() - days)
      query.gte('created_at', date.toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    const totalSales = (data || [])
      .filter(o => o.status === 'completed' || o.status === 'paid' || o.status === 'delivered')
      .reduce((acc, curr) => acc + (curr.total || 0), 0)

    const totalOrders = (data || []).length
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0

    return { totalSales, totalOrders, avgTicket, orders: data || [] }
  },

  getOrdersByZone: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('orders')
      .select('delivery_address, total, status, created_at')
      .eq('store_id', storeId)
      .not('delivery_address', 'is', null)

    if (error) throw error
    return data || []
  },

  getTopProducts: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('order_items')
      .select('quantity, unit_price, product_id, products(name), orders!inner(store_id)')
      .eq('orders.store_id', storeId)

    if (error) throw error
    return data || []
  },

  getTopCustomers: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('orders')
      .select('customer_name, customer_whatsapp, total, created_at')
      .eq('store_id', storeId)

    if (error) throw error
    return data || []
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

    // 1. Intentar actualización directa (funciona si RLS lo permite)
    const { data: updated, error } = await supabase
      .from('stores')
      .update(data)
      .eq('id', storeId)
      .select()
      .single()

    if (!error && updated) return updated as unknown as Tenant

    // 2. Fallback: usar RPC para multi-store (bypasses RLS con validación propia)
    console.warn('[tenantApi.updateMe] Direct update failed, trying RPC fallback:', error?.message)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_my_store', {
      p_store_id: storeId,
      p_data: data
    })

    if (rpcError) throw rpcError
    return rpcResult as unknown as Tenant
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
      }, { onConflict: 'store_id,provider,is_master' })
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// --- Cupones ---
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
    const updateData: any = { ...data }
    if (data.value) updateData.value = Number(data.value)
    if (data.min_purchase_amount !== undefined) updateData.min_purchase_amount = Number(data.min_purchase_amount)
    if (data.usage_limit !== undefined) updateData.usage_limit = data.usage_limit ? Number(data.usage_limit) : null

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

    // 6. pending_actions (Trials expiring in less than 3 days)
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
      failed_payments: 0, // Placeholder hasta tener logs de errores de pago
      pending_actions: pendingTrials || 0
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
    // 1. Limpiar perfiles vinculados (evita bloqueo por FK)
    await supabase.from('profiles').update({ store_id: null }).eq('store_id', id)

    // 2. Traer órdenes para borrar sus items primero
    const { data: orders } = await supabase.from('orders').select('id').eq('store_id', id)
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id)
      await supabase.from('order_items').delete().in('order_id', orderIds)
      await supabase.from('orders').delete().in('id', orderIds)
    }

    // 3. Borrar contenido directo de la tienda
    await supabase.from('products').delete().eq('store_id', id)
    await supabase.from('categories').delete().eq('store_id', id)
    await supabase.from('subscriptions').delete().eq('store_id', id)
    await supabase.from('gateways').delete().eq('store_id', id)
    await supabase.from('coupons').delete().eq('store_id', id)

    // 4. Intentar borrar registros de tablas opcionales si existen
    try {
      await supabase.from('sliders').delete().eq('store_id', id)
      await supabase.from('popups').delete().eq('store_id', id)
      await supabase.from('crm_contacts').delete().eq('store_id', id)
    } catch (e) {
      console.warn('Tablas opcionales no encontradas o sin permisos:', e)
    }

    // 5. Borrar la tienda finalmente
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) throw error
  },

  createTenant: async (data: { name: string; slug: string; email: string; country?: string; is_active?: boolean; password?: string; whatsapp?: string; plan_type?: string }) => {
    // 1. Check if user already exists in auth or profiles
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    let authUserId: string | null = existingProfiles?.id || null

    if (!authUserId) {
      // Create the Auth User (Invitation) using a temp client to avoid logout
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
        // Check if it's already registered but not in profiles? (Unlikely with triggers but possible)
        if (authError.message.toLowerCase().includes('already registered')) {
          // We'll try to proceed manually by trusting the slug match below
          console.log('User already registered in Auth, proceeding to match store...')
        } else {
          throw authError
        }
      }
      authUserId = authData.user?.id || null
    }

    // 2. We wait a bit for the trigger to create the store or update it manually
    // Since we want to ensure 'country' is saved, we update the store by slug
    // It's safer to insert the store FIRST and then let the user register, 
    // OR create the user and then update the store created by the trigger.

    // Let's assume the trigger is fast. We search for the store by slug.
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
      // Update with extra info
      await supabase.from('stores').update({
        country: data.country,
        is_active: data.is_active ?? true
      }).eq('id', storeId)
    } else {
      // Backup: Create the store manually if trigger failed or doesn't exist
      const { data: newStore, error: insertError } = await supabase.from('stores').insert({
        name: data.name,
        slug: data.slug,
        country: data.country,
        is_active: data.is_active ?? true
      }).select().single()
      if (insertError) throw insertError
      return newStore as Tenant
    }

    const { data: finalStore } = await supabase.from('stores').select('*').eq('id', storeId).single()

    // 3. Create subscription: Default 15-day PRO trial
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 15)

    await supabase.from('subscriptions').upsert({
      store_id: storeId,
      plan_type: data.plan_type || 'pro',
      status: data.plan_type ? 'active' : 'trial',
      current_period_end: trialEndDate.toISOString(),
      billing_cycle: 'monthly'
    }, { onConflict: 'store_id' })

    // Also update the store metadata to reflect the plan
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
    // Generar últimos 7 días
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })

    // 1. Tendencia de ingresos y órdenes (Últimos 7 días)
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

    // 2. Tiendas de alto rendimiento (Top 5 por total de ventas)
    // Usamos todo el histórico o el último mes para esto
    const { data: storeStats } = await supabase
      .from('orders')
      .select('total, store_id, stores(name)')

    const storeMap: Record<string, any> = {}
    storeStats?.forEach((o: any) => {
      const id = o.store_id
      if (!id) return
      if (!storeMap[id]) storeMap[id] = { name: o.stores?.name, sales: 0, orders: 0 }
      storeMap[id].sales += o.total || 0
      storeMap[id].orders += 1
    })

    const top_stores = Object.values(storeMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
      .map(s => ({
        ...s,
        growth: '+12%', // Crecimiento mensual estimado
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
    // Convert array of key-value pairs to object
    return (data || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value
      return acc
    }, {})
  },

  updateGlobalSettings: async (settings: any) => {
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
    // Nota: En un entorno real esto usaría supabase.auth.admin.inviteUserByEmail
    // Aquí simulamos la creación de un perfil con rol superadmin directamente
    // (A fines de demo/desarrollo rápido si el usuario ya existe)
    console.log('Inviting staff:', email)
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'superadmin' })
      .eq('email', email)
      .select()
      .single()

    if (error) throw new Error('El usuario debe estar registrado primero para ser promovido a superadmin.')
    return data
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

  listSubscriptions: async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, stores(name)')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data || []).map(s => ({
      ...s,
      store_name: (s as any).stores?.name
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

  updateSubscription: async (storeId: string, data: any) => {
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .upsert({ store_id: storeId, ...data }, { onConflict: 'store_id' })
      .select()
      .single()
    if (error) throw error
    return updated
  },

  cloneTenant: async (sourceId: string, data: { name: string; slug: string; email: string }) => {
    // 1. Get Source Store
    const { data: sourceStore, error: sourceError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', sourceId)
      .single()

    if (sourceError || !sourceStore) throw new Error('No se pudo encontrar la tienda origen')

    // 2. Create New Store (and Auth) using existing createTenant logic
    const newStore = await superadminApi.createTenant({
      name: data.name,
      slug: data.slug,
      email: data.email,
      country: sourceStore.country || 'Argentina',
      is_active: true,
      plan_type: (sourceStore.metadata as any)?.plan_type || 'free'
    })

    // 3. Copy Metadata & Settings from Source
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        logo_url: sourceStore.logo_url,
        banner_url: sourceStore.banner_url,
        description: sourceStore.description,
        whatsapp: sourceStore.whatsapp || '',
        address: sourceStore.address,
        primary_color: sourceStore.primary_color,
        metadata: sourceStore.metadata,
        ai_prompt: sourceStore.ai_prompt,
        physical_schedule: sourceStore.physical_schedule,
        online_schedule: sourceStore.online_schedule,
        delivery_cost: sourceStore.delivery_cost,
        delivery_info: sourceStore.delivery_info
      })
      .eq('id', newStore.id)

    if (updateError) console.error('Error copying store settings:', updateError)

    // 4. Copy Categories & Products
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', sourceId)

    if (categories && categories.length > 0) {
      for (const cat of categories) {
        // Create New Category
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
          // Fetch Products for this source Category
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

    // 5. Copy Subscription from Source Store
    const { data: sourceSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('store_id', sourceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sourceSub) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          store_id: newStore.id,
          plan_type: sourceSub.plan_type,
          status: sourceSub.status,
          current_period_start: sourceSub.current_period_start,
          current_period_end: sourceSub.current_period_end,
          billing_cycle: sourceSub.billing_cycle,
        })

      if (subError) console.error('Error copying subscription:', subError)
      else console.log('[cloneTenant] Subscription copied:', sourceSub.plan_type)
    }

    return newStore
  }
}

// --- Facturación ---
export const billingApi = {
  getPlans: async (): Promise<any[]> => {
    // Mock de planes (estos podrían venir de una tabla 'plans' en el futuro)
    return [
      { id: 'free', name: 'Free', price: 0, annual_price: 0, features: ['2 Categorías', '10 Productos por cat.', 'Módulos Principales', 'Menú QR'] },
      { id: 'advance', name: 'Advance', price: 4.99, annual_price: 49.90, features: ['4 Categorías', '20 Productos por cat.', 'Estadísticas', 'Control de Horarios', 'Costo envío por zonas'] },
      { id: 'pro', name: 'Premium', price: 9.99, annual_price: 99.90, features: ['Categorías Ilimitadas', 'Productos Ilimitados', 'Seguimiento de Pedido', 'Campos Personalizados', 'Exportar a Excel'], is_popular: true },
      { id: 'vip', name: 'VIP', price: 14.99, annual_price: 149.90, features: ['Todo lo anterior', 'VENDEx Bot (En desarrollo)', 'Cabify Logistics (En desarrollo)', 'Facebook Pixel', 'Google Analytics'] },
    ]
  },

  getCurrentSubscription: async () => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle() // Use maybeSingle to avoid 406/PGRST116 errors on UI

    if (error) {
      console.error('Error fetching subscription:', error)
      throw error
    }

    // Si no hay suscripción en DB, devolvemos un objeto por defecto (Free) para que la UI no rompa
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

    // Aquí iría la llamada a un Edge Function de Supabase o backend
    // que interactúe con la API de Stripe/MercadoPago.
    // Simulamos una respuesta exitosa.
    console.log(`Iniciando checkout para el plan ${planId} en la tienda ${storeId}`)
    return { checkout_url: 'https://checkout.vendexchat.app/mock-session' }
  }
}
// --- Storage (Imágenes) ---
export const storageApi = {
  uploadImage: async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      })

    if (error) {
      console.error('storageApi.uploadImage error:', error)
      throw error
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return publicUrl
  }
}
