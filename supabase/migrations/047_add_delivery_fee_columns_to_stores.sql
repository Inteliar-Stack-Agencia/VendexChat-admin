-- Migration 047: Add missing delivery-related columns to stores table
-- The update_my_store RPC references these columns but they were never created.

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS min_order NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS free_delivery_from NUMERIC(12, 2) DEFAULT 0;
