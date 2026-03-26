-- Reemplazar unique constraint de custom_domain solo
-- por unique compuesto (custom_domain, custom_path)
-- para permitir path-based routing (varios stores con mismo dominio)

ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_custom_domain_key;

ALTER TABLE stores
  ADD CONSTRAINT stores_custom_domain_path_key
  UNIQUE (custom_domain, custom_path);
