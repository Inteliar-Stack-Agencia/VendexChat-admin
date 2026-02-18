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
          role: 'client'
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario')

    // 2. Crear tienda vinculando el owner_id (Requerido por RLS)
    const { error: storeError } = await supabase.from('stores').insert({
      name: data.store_name,
      slug: data.slug,
      owner_id: authData.user.id
    })

    if (storeError) {
      console.error('Error creating store:', storeError)
      throw new Error('Usuario creado pero no se pudo registrar la tienda: ' + storeError.message)
    }

    return {
      token: authData.session?.access_token || '',
      user: authData.user as unknown as User
    }
  },

  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return { user: user as unknown as User }
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
    // Implementación básica de estadísticas vía Supabase
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: productsCount } = await supabase.from('products').select('*', { count: 'exact', head: true })

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
    let query = supabase.from('products').select('*', { count: 'exact' })

    if (params?.search) query = query.ilike('name', `%${params.search}%`)
    if (params?.category_id) query = query.eq('category_id', params.category_id)

    const from = ((params?.page || 1) - 1) * (params?.limit || 10)
    const to = from + (params?.limit || 10) - 1

    const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })
    if (error) throw error

    return {
      data: data as Product[],
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
    // Asegurar que usamos 'price' y no 'final_price'
    const { data: newProd, error } = await supabase.from('products').insert({
      ...data,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
      stock: typeof data.stock === 'string' ? parseInt(data.stock) : data.stock
    }).select().single()
    if (error) throw error
    return newProd as Product
  },

  update: async (id: string | number, data: Partial<ProductFormData>) => {
    const updateData: any = { ...data }
    if (data.price) updateData.price = typeof data.price === 'string' ? parseFloat(data.price) : data.price
    if (data.stock) updateData.stock = typeof data.stock === 'string' ? parseInt(data.stock) : data.stock

    const { data: updatedProd, error } = await supabase.from('products').update(updateData).eq('id', id).select().single()
    if (error) throw error
    return updatedProd as Product
  },

  delete: async (id: string | number) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },
}

// --- Categorías ---
export const categoriesApi = {
  list: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) throw error
    return data as Category[]
  },

  create: async (data: { name: string; sort_order?: number }) => {
    const { data: newCat, error } = await supabase.from('categories').insert(data).select().single()
    if (error) throw error
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
    let query = supabase.from('orders').select('*', { count: 'exact' })
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

// --- Tenant (Configuración de la tienda) ---
export const tenantApi = {
  getMe: async () => {
    // Como simplificación para esta etapa, usamos el slug 'morfi-demo'
    const { data, error } = await supabase.from('stores').select('*').eq('slug', 'morfi-demo').single()
    if (error) throw error
    return data as Tenant
  },

  updateMe: async (data: Partial<Tenant>) => {
    const { data: updated, error } = await supabase.from('stores').update(data).eq('slug', 'morfi-demo').select().single()
    if (error) throw error
    return updated as Tenant
  },
}

// --- Superadmin ---
export const superadminApi = {
  dashboard: async (): Promise<any> => {
    const { count: tenantsCount } = await supabase.from('stores').select('*', { count: 'exact', head: true })
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })

    return {
      total_tenants: tenantsCount || 0,
      total_orders: ordersCount || 0,
      total_revenue: 0,
      new_registrations_week: 0,
      tenants: []
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
      tenant_name: (u as any).stores?.name
    })) as any[]
  },

  createUser: async (data: any) => {
    // Requiere lógica de Admin Auth
    const { data: newUser, error } = await supabase.from('profiles').insert({
      name: data.name,
      role: data.role,
      store_id: data.tenant_id
    }).select().single()
    if (error) throw error
    return newUser
  },

  updateUser: async (id: string | number, data: any) => {
    const { data: updated, error } = await supabase.from('profiles').update({
      name: data.name,
      role: data.role,
      store_id: data.tenant_id
    }).eq('id', id).select().single()
    if (error) throw error
    return updated
  },

  deleteUser: async (id: string | number) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) throw error
  }
}
