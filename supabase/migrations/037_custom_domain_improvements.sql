-- Migration: Custom Domain Improvements
-- Agrega índice para búsquedas rápidas por custom_domain (usado por el Worker)
-- y columna para trackear el ID del Custom Hostname de Cloudflare (SSL for SaaS)

-- Índice para que el Worker resuelva hostname → slug en O(log n)
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain
  ON stores(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Columna para guardar el ID del Custom Hostname registrado en Cloudflare
-- Necesario para poder eliminarlo cuando el tenant cambia/quita su dominio
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS custom_hostname_cf_id TEXT DEFAULT NULL;
