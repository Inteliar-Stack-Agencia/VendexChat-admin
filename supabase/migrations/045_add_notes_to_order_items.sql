-- Migration 045: Add notes column to order_items
-- Stores per-item delivery day selected by the customer in the storefront
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT;
