-- Add popups column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS popups JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Comment for migration tracking
COMMENT ON COLUMN public.stores.popups IS 'Lista de mensajes emergentes para la tienda';
