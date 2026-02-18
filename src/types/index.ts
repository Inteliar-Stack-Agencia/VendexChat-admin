// ========================================
// VENDExChat Admin - Tipos TypeScript
// ========================================

// --- Usuario y Autenticación ---
// --- Usuario y Autenticación ---
export interface User {
  id: string // Supabase Auth uses UUID
  email: string
  name: string
  role: 'client' | 'superadmin'
  store_id: number | null
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  store_name: string
  email: string
  password: string
  slug: string
}

export interface AuthResponse {
  token: string
  user: User
}

// --- Tenant (Tienda) ---
export interface Tenant {
  id: number
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  instagram: string | null
  facebook: string | null
  accept_orders: boolean
  primary_color: string
  welcome_message: string | null
  footer_message: string | null
  min_order: number
  delivery_cost: number
  schedule: Record<string, ScheduleDay> | null
  is_active: boolean
  created_at: string
}

export interface ScheduleDay {
  open: boolean
  intervals: { start: string; end: string }[]
}

// --- Producto ---
export interface Product {
  id: number
  store_id: number
  name: string
  description: string | null
  price: number
  stock: number
  unlimited_stock: boolean
  image_url: string | null
  category_id: number | null
  category_name?: string
  is_active: boolean
  is_featured: boolean
  created_at: string
}

export interface ProductFormData {
  name: string
  description: string
  price: number | string
  stock: number | string
  unlimited_stock: boolean
  image_url: string
  category_id: number | string
  is_active: boolean
  is_featured: boolean
}

// --- Categoría ---
export interface Category {
  id: number
  store_id: number
  name: string
  sort_order: number
  product_count?: number
  created_at: string
}

// --- Pedido ---
export interface Order {
  id: number
  store_id: number
  order_number: string
  customer_name: string
  customer_whatsapp: string
  customer_address: string | null
  customer_notes: string | null
  status: OrderStatus
  subtotal: number
  delivery_cost: number
  total: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

// --- Dashboard ---
export interface DashboardStats {
  orders_today: number
  sales_today: number
  active_products: number
  recent_orders: Order[]
  low_stock_products: Product[]
}

// --- Superadmin ---
export interface SuperadminDashboard {
  total_tenants: number
  total_orders: number
  total_revenue: number
  new_registrations_week: number
  tenants: Tenant[]
}

export interface SuperadminUser {
  id: string
  email: string
  name: string
  role: string
  store_id: number | null
  store_name?: string
  last_login: string | null
  is_active: boolean
  created_at: string
}

// --- API Response genérico ---
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}
