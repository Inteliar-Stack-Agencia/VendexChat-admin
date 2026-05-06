-- Migration 049: Add missing order/delivery flag columns to stores table

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS accepts_delivery BOOLEAN DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS accepts_pickup BOOLEAN DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS accept_orders BOOLEAN DEFAULT true;
