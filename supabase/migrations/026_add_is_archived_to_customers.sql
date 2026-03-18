-- Add is_archived column to customers table
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Index for filtering archived customers by store
CREATE INDEX IF NOT EXISTS idx_customers_store_archived ON customers(store_id, is_archived);
