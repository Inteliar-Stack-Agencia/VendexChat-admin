-- Add sliders column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sliders JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Comment for migration tracking
COMMENT ON COLUMN stores.sliders IS 'Lista de sliders promocionales para la tienda';
