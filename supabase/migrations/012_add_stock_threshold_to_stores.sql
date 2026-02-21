-- Add low_stock_threshold column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;

-- Comment for migration tracking
COMMENT ON COLUMN stores.low_stock_threshold IS 'Umbral mínimo de unidades para disparar alerta de stock bajo';
