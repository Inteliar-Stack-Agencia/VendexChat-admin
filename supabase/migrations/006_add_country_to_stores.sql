-- Add country column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS country TEXT;

-- Update RLS if necessary (usually stores are public or handled by policies)
-- Assuming existing policies allow superadmin to manage all columns.
