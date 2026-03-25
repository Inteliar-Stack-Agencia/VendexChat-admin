-- Permite path-based routing: morfiviandas.com/laplata → tenant "laplata"
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS custom_path TEXT DEFAULT NULL;

-- Índice para resolver hostname + path → tenant eficientemente
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain_path
  ON stores(custom_domain, custom_path)
  WHERE custom_domain IS NOT NULL;
