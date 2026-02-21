-- Add metadata column to stores table for flexible settings (like payment methods)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Comment for migration tracking
COMMENT ON COLUMN stores.metadata IS 'Metadatos adicionales de la tienda (Configuración de pagos, etc)';
