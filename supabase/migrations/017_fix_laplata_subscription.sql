-- FIX RÁPIDO: Copiar suscripción de "Morfi Viandas" a "Morfi Viandas La Plata"
-- Ejecutar en Supabase SQL Editor

-- 1. Copiar la suscripción activa
INSERT INTO subscriptions (store_id, plan_type, status, current_period_start, current_period_end, billing_cycle)
SELECT 
  (SELECT id FROM stores WHERE slug = 'morfilaplata') as store_id,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.billing_cycle
FROM subscriptions s
WHERE s.store_id = (SELECT id FROM stores WHERE slug = 'morfiviandas')
ORDER BY s.created_at DESC
LIMIT 1
ON CONFLICT DO NOTHING;

-- 2. Verificar que se copió
SELECT st.name, sub.plan_type, sub.status 
FROM stores st 
LEFT JOIN subscriptions sub ON sub.store_id = st.id 
WHERE st.slug IN ('morfiviandas', 'morfilaplata');
