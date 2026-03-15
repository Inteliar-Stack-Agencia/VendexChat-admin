-- Upgrade morfiviandas and morfilaplata to ULTRA plan

-- 1. Update subscriptions table
UPDATE subscriptions
SET
  plan_type = 'ultra',
  status = 'active',
  current_period_end = NOW() + INTERVAL '10 years',
  updated_at = NOW()
WHERE store_id IN (
  SELECT id FROM stores WHERE slug IN ('morfiviandas', 'morfilaplata')
);

-- 2. Insert subscription if it doesn't exist yet
INSERT INTO subscriptions (store_id, plan_type, status, billing_cycle, current_period_start, current_period_end)
SELECT
  s.id,
  'ultra',
  'active',
  'annual',
  NOW(),
  NOW() + INTERVAL '10 years'
FROM stores s
WHERE s.slug IN ('morfiviandas', 'morfilaplata')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions sub WHERE sub.store_id = s.id
  );

-- 3. Update stores metadata
UPDATE stores
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"plan_type": "ultra"}'::jsonb
WHERE slug IN ('morfiviandas', 'morfilaplata');
