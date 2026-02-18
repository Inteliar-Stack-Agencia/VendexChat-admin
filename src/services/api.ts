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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
    const storeId = profile?.store_id

    if (!storeId) return { orders_today: 0, sales_today: 0, active_products: 0, recent_orders: [], low_stock_products: [] }

    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('store_id', storeId)
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId)

    return {
      orders_today: ordersCount || 0,
      sales_today: 0,
      active_products: productsCount || 0,
      recent_orders: [],
      low_stock_products: []
    }
  }
}

// --- Productos ---
export const productsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; category_id?: number | string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user?.id).single()
    const storeId = profile?.store_id

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
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user?.id).single()

    const { data: newProd, error } = await supabase.from('products').insert({
      ...data,
      store_id: profile?.store_id,
      price: Number(data.price),
      stock: Number(data.stock),
      category_id: data.category_id ? Number(data.category_id) : null
    }).select('*, categories(name)').single()
    if (error) throw error
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión de usuario activa')

    const { data: profile, error: profileError } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
    if (profileError || !profile?.store_id) throw new Error('No se encontró el ID de la tienda del usuario')

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('name')

    if (error) throw error
    return data as Category[]
  },

  create: async (data: { name: string; sort_order?: number }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No hay sesión activa')

    const { data: profile, error: profileError } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
    if (profileError || !profile?.store_id) throw new Error('Error al identificar la tienda (store_id ausente)')

    const { data: newCat, error } = await supabase.from('categories').insert({
      ...data,
      store_id: profile.store_id
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

  delete: async (id: string | number) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}

// --- Pedidos ---
export const ordersApi = {
  list: async (params?: { status?: string; page?: number; limit?: number }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user?.id).single()

    let query = supabase.from('orders').select('*', { count: 'exact' }).eq('store_id', profile?.store_id)
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
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user?.id).single()

    // Obtenemos los datos de la tabla orders para derivar los clientes
    const { data, error } = await supabase
      .from('orders')
      .select('customer_name, customer_whatsapp, customer_address')
      .eq('store_id', profile?.store_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Eliminar duplicados por whatsapp
    const uniqueCustomers = new Map()
    data?.forEach(order => {
      if (!uniqueCustomers.has(order.customer_whatsapp)) {
        uniqueCustomers.set(order.customer_whatsapp, {
          name: order.customer_name,
          whatsapp: order.customer_whatsapp,
          address: order.customer_address
        })
      }
    })

    return Array.from(uniqueCustomers.values())
  }
}

// --- Tenant (Configuración de la tienda) ---
export const tenantApi = {
  getMe: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, stores(*)')
      .eq('id', user?.id)
      .single()

    if (!profile?.stores) throw new Error('No store found for this user')
    return profile.stores as unknown as Tenant
  },

  updateMe: async (data: Partial<Tenant>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user?.id).single()

    const { data: updated, error } = await supabase
      .from('stores')
      .update(data)
      .eq('id', profile?.store_id)
      .select()
      .single()

    if (error) throw error
    return updated as Tenant
  },
}

// --- Superadmin ---
export const superadminApi = {
  dashboard: async (): Promise<any> => {
    const { count: storesCount } = await supabase.from('stores').select('*', { count: 'exact', head: true })
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })

    return {
      total_stores: storesCount || 0,
      total_orders: ordersCount || 0,
      total_revenue: 0,
      new_registrations_week: 0,
      stores: []
    }
  },

  listTenants: async () => {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as Tenant[]
  },

  createTenant: async (data: any) => {
    // Nota: Crear un tenant implica crear un usuario y una tienda.
    // Para compilar, implementamos la parte de la tienda.
    const { data: newTenant, error } = await supabase.from('stores').insert({
      name: data.name,
      slug: data.slug,
      whatsapp: data.whatsapp,
      is_active: data.is_active,
      // El email/password requerirían lógica de Admin Auth (Edge Function preferiblemente)
    }).select().single()
    if (error) throw error
    return newTenant as Tenant
  },

  updateTenant: async (id: string | number, data: Partial<Tenant>) => {
    const { data: updated, error } = await supabase.from('stores').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated as Tenant
  },

  deleteTenant: async (id: string | number) => {
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) throw error
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
    // Requiere lógica de Admin Auth
    const { data: newUser, error } = await supabase.from('profiles').insert({
      name: data.name,
      role: data.role,
      store_id: data.store_id
    }).select().single()
    if (error) throw error
    return newUser
  },

  updateUser: async (id: string | number, data: any) => {
    const { data: updated, error } = await supabase.from('profiles').update({
      name: data.name,
      role: data.role,
      store_id: data.store_id
    }).eq('id', id).select().single()
    if (error) throw error
    return updated
  },

  deleteUser: async (id: string | number) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) throw error
  }
}
