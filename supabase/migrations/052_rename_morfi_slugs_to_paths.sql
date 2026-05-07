-- Migration 052: Rename Morfi store slugs to match their custom domain paths
--
-- Before: morfiviandas / morfilaplata / morfi-empresas
-- After:  caba          / laplata      / empresas
--
-- This simplifies routing: slug = path segment, so
--   morfiviandas.com.ar/caba     → vendexchat.app/caba
--   morfiviandas.com.ar/laplata  → vendexchat.app/laplata
--   morfiviandas.com.ar/empresas → vendexchat.app/empresas
--
-- Side effect: vendexchat.app/morfiviandas, /morfilaplata, /morfi-empresas
-- no longer resolve — replaced by /caba, /laplata, /empresas.

-- Clear custom_domain first to avoid unique constraint conflicts
-- while renaming slugs (slug is also unique).
UPDATE stores SET custom_domain = NULL, custom_path = NULL
WHERE slug IN ('morfiviandas', 'morfilaplata', 'morfi-empresas');

-- Rename slugs
UPDATE stores SET slug = 'caba'     WHERE slug = 'morfiviandas';
UPDATE stores SET slug = 'laplata'  WHERE slug = 'morfilaplata';
UPDATE stores SET slug = 'empresas' WHERE slug = 'morfi-empresas';

-- Set custom_domain + custom_path + is_active for all three
UPDATE stores
SET custom_domain = 'morfiviandas.com.ar', custom_path = 'caba', is_active = true
WHERE slug = 'caba';

UPDATE stores
SET custom_domain = 'morfiviandas.com.ar', custom_path = 'laplata', is_active = true
WHERE slug = 'laplata';

UPDATE stores
SET custom_domain = 'morfiviandas.com.ar', custom_path = 'empresas', is_active = true
WHERE slug = 'empresas';
