-- Migration 024: Fix delivery_cost column name in orders table
-- The migration 018 created 'order_delivery_cost' but the code expects 'delivery_cost'

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(12, 2) DEFAULT 0;

-- Copy data from order_delivery_cost if it exists and delivery_cost is empty
UPDATE public.orders
SET delivery_cost = order_delivery_cost
WHERE order_delivery_cost IS NOT NULL
  AND order_delivery_cost > 0
  AND (delivery_cost IS NULL OR delivery_cost = 0);
