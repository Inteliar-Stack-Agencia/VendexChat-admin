-- Add split schedule columns to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS physical_schedule JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS online_schedule JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Comment for migration tracking
COMMENT ON COLUMN stores.physical_schedule IS 'Horarios de atención para el local físico';
COMMENT ON COLUMN stores.online_schedule IS 'Horarios de atención para la tienda online';
