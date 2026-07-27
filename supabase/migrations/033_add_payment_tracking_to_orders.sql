-- Add payment tracking columns to orders table
ALTER TABLE orders
  ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  ADD COLUMN paid_amount DECIMAL(10, 2),
  ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN payment_notes TEXT;

-- Index for faster queries on payment status
CREATE INDEX idx_orders_payment_status ON orders(store_id, payment_status);
CREATE INDEX idx_orders_paid_at ON orders(store_id, paid_at);
