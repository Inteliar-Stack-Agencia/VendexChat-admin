-- Migration 051: Set custom_domain/path for morfi-empresas
--
-- morfi-empresas is a clone of morfiviandas with a different look (enterprise).
-- It should be accessible at morfiviandas.com.ar/empresas.
--
-- Also re-ensures morfiviandas and morfilaplata have the correct values
-- in case migration 050 rows weren't matched (e.g. slug mismatch).

UPDATE stores
SET
  custom_domain = 'morfiviandas.com.ar',
  custom_path   = 'empresas',
  is_active     = true
WHERE slug = 'morfi-empresas';

-- Re-ensure root (CABA) and La Plata are correct
UPDATE stores
SET
  custom_domain = 'morfiviandas.com.ar',
  custom_path   = NULL,
  is_active     = true
WHERE slug = 'morfiviandas';

UPDATE stores
SET
  custom_domain = 'morfiviandas.com.ar',
  custom_path   = 'laplata',
  is_active     = true
WHERE slug = 'morfilaplata';
