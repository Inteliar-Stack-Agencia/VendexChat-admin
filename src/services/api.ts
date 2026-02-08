// ========================================
// VENDExChat Admin - Servicio API principal
// ========================================

const API_URL = import.meta.env.VITE_API_URL || 'https://api.vendexchat.app'

// Obtiene el token guardado en localStorage
function getToken(): string | null {
  return localStorage.getItem('vendexchat_token')
}

// Función principal para hacer peticiones al backend
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Agregar token de autenticación si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Si el token es inválido, limpiar y redirigir a login
  if (response.status === 401) {
    localStorage.removeItem('vendexchat_token')
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de conexión' }))
    throw new Error(error.message || `Error ${response.status}`)
  }

  // Si la respuesta es 204 (No Content), retornar vacío
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: import('../types').RegisterRequest) =>
    request<{ token: string; user: import('../types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    request<{ user: import('../types').User }>('/auth/me'),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
}

// --- Dashboard ---
export const dashboardApi = {
  getStats: () =>
    request<import('../types').DashboardStats>('/dashboard/stats'),
}

// --- Productos ---
export const productsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; category_id?: number | string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category_id) searchParams.set('category_id', String(params.category_id))
    const query = searchParams.toString()
    return request<import('../types').PaginatedResponse<import('../types').Product>>(
      `/products${query ? `?${query}` : ''}`
    )
  },

  get: (id: number) =>
    request<import('../types').Product>(`/products/${id}`),

  create: (data: import('../types').ProductFormData) =>
    request<import('../types').Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('../types').ProductFormData>) =>
    request<import('../types').Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/products/${id}`, { method: 'DELETE' }),
}

// --- Categorías ---
export const categoriesApi = {
  list: () =>
    request<import('../types').Category[]>('/categories'),

  get: (id: number) =>
    request<import('../types').Category>(`/categories/${id}`),

  create: (data: { name: string; sort_order?: number }) =>
    request<import('../types').Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name?: string; sort_order?: number }) =>
    request<import('../types').Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }),
}

// --- Pedidos ---
export const ordersApi = {
  list: (params?: { status?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params?.date_from) searchParams.set('date_from', params.date_from)
    if (params?.date_to) searchParams.set('date_to', params.date_to)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return request<import('../types').PaginatedResponse<import('../types').Order>>(
      `/orders${query ? `?${query}` : ''}`
    )
  },

  get: (id: number) =>
    request<import('../types').Order>(`/orders/${id}`),

  updateStatus: (id: number, status: import('../types').OrderStatus) =>
    request<import('../types').Order>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
}

// --- Tenant (Configuración de la tienda) ---
export const tenantApi = {
  getMe: () =>
    request<import('../types').Tenant>('/tenants/me'),

  updateMe: (data: Partial<import('../types').Tenant>) =>
    request<import('../types').Tenant>('/tenants/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// --- Superadmin ---
export const superadminApi = {
  dashboard: () =>
    request<import('../types').SuperadminDashboard>('/superadmin/dashboard'),

  // Tenants
  listTenants: () =>
    request<import('../types').Tenant[]>('/superadmin/tenants'),

  createTenant: (data: Partial<import('../types').Tenant> & { email: string; password: string }) =>
    request<import('../types').Tenant>('/superadmin/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTenant: (id: number, data: Partial<import('../types').Tenant>) =>
    request<import('../types').Tenant>(`/superadmin/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTenant: (id: number) =>
    request<void>(`/superadmin/tenants/${id}`, { method: 'DELETE' }),

  // Users
  listUsers: () =>
    request<import('../types').SuperadminUser[]>('/superadmin/users'),

  createUser: (data: { email: string; name: string; password: string; role: string; tenant_id?: number }) =>
    request<import('../types').SuperadminUser>('/superadmin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: number, data: Partial<import('../types').SuperadminUser> & { password?: string }) =>
    request<import('../types').SuperadminUser>(`/superadmin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
