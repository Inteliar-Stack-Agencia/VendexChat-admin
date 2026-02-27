-- Migration 019: Fix order_items schema consistency
-- Add missing columns to order_items table to match all expected versions

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);

-- Note: We add these as optional (nullable) initially to avoid breaking existing data,
-- but the frontend will now send all of them.
