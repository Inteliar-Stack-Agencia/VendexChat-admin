-- Migration 018: Fix orders schema to match frontend expectations
-- Add missing columns to orders table

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(12, 2) DEFAULT 0;

-- Ensure constraints or defaults if needed
-- (The columns are already added with IF NOT EXISTS)

-- Rename column if needed (but we'll adjust frontend instead to use existing customer_address)
-- Actually, let's keep it simple and just add what's missing.
