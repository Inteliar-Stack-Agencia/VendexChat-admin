-- Add mp_payment_id column to subscriptions table for tracking Mercado Pago payments
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
