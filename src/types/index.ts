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
  store_id: string | null
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
  country: string
  city: string
}

export interface AuthResponse {
  token: string
  user: User
}

// --- Tenant (Tienda) ---
export interface Tenant {
  id: string
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
  banner_url: string | null
  delivery_cost: number
  delivery_info: string | null
  custom_domain: string | null
  schedule: Record<string, ScheduleDay> | null // Legacy
  physical_schedule: Record<string, ScheduleDay> | null
  online_schedule: Record<string, ScheduleDay> | null
  sliders: Slider[]
  country: string | null
  city: string | null
  is_active: boolean;
  coupons_enabled: boolean;
  metadata?: any;
  ai_prompt?: string | null;
  low_stock_threshold: number;
  popups: Popup[];
  created_at: string;
}

export interface Slider {
  id: string | number
  url: string
  link: string
  active: boolean
}

export interface ScheduleDay {
  open: boolean
  intervals: { start: string; end: string }[]
}

export interface Popup {
  id: string | number
  title: string
  message: string
  active: boolean
}

// --- Producto ---
export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  stock: number
  unlimited_stock: boolean
  image_url: string | null
  category_id: string | null
  category_name?: string
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
}

export interface ProductFormData {
  name: string
  description: string
  price: number | string
  stock: number | string
  unlimited_stock: boolean
  image_url: string
  category_id: string
  is_active: boolean
  is_featured: boolean
  sort_order?: number
}

// --- Categoría ---
export interface Category {
  id: string
  store_id: string
  name: string
  sort_order: number
  product_count?: number
  created_at: string
}

// --- Cupón ---
export interface Coupon {
  id: string
  store_id: string
  code: string
  type: 1 | 2 | 3 | 4 | 5 | 6 // 1: % All, 2: $ All, 3: % Selected, 4: $ Selected, 5: % Cat, 6: $ Cat
  value: number
  start_date: string
  end_date: string | null
  usage_limit: number | null
  usage_count: number
  min_purchase_amount: number
  is_active: boolean
  applicable_products: string[] // List of product IDs
  applicable_categories: string[] // List of category IDs
  created_at: string
}

export interface CouponFormData {
  code: string
  type: number
  value: number | string
  start_date: string
  end_date: string
  usage_limit: number | string
  min_purchase_amount: number | string
  is_active: boolean
  applicable_products: string[]
  applicable_categories: string[]
}

// --- Pedido ---
export interface Order {
  id: string
  store_id: string
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
  metadata?: any | null
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface OrderItem {
  id: string
  product_id: string
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
  total_stores: number
  total_orders: number
  total_revenue: number
  new_registrations_week: number
  stores: Tenant[]
}

export interface SuperadminUser {
  id: string
  email: string
  name: string
  role: string
  store_id: string | null
  store_name?: string
  last_login: string | null
  is_active: boolean
  created_at: string
}

// --- Facturación y Suscripciones ---
export interface Subscription {
  id: string
  store_id: string
  plan_type: 'free' | 'pro' | 'vip' | 'ultra'
  status: 'active' | 'past_due' | 'canceled' | 'trial'
  billing_cycle: 'monthly' | 'annual'
  discount_percentage: number
  is_manual: boolean
  internal_notes: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_subscription_id?: string
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  annual_price: number
  interval: 'month' | 'year'
  features: string[]
  is_popular?: boolean
}

export interface PaymentGateway {
  id: string
  store_id: string | null
  provider: 'stripe' | 'mercadopago' | 'paypal'
  is_master: boolean
  config: {
    public_key: string
    secret_key?: string
    access_token?: string
  }
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
