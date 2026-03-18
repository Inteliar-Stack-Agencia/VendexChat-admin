-- Migration 028: Fix subscriptions for cloned stores
--
-- When cloneTenant runs, createTenant first creates a 15-day trial subscription.
-- Then cloneTenant tries to INSERT the source subscription (ultra/active with long
-- current_period_end), but this silently fails due to a conflict on store_id.
-- The clone ends up with a 15-day trial instead of the source's subscription.
--
-- The code fix changes INSERT to UPSERT going forward.
-- This migration fixes all existing clones that were created with the wrong subscription.
--
-- We identify clones as stores whose subscription current_period_end is ~15 days
-- from their created_at (the createTenant trial window), while their plan_type
-- should be 'ultra' based on metadata.

-- Fix centraltiendacopia: copy subscription from centraltienda
UPDATE subscriptions
SET
    plan_type      = src.plan_type,
    status         = src.status,
    current_period_start = src.current_period_start,
    current_period_end   = src.current_period_end,
    billing_cycle  = src.billing_cycle
FROM (
    SELECT sub.*
    FROM subscriptions sub
    JOIN stores s ON s.id = sub.store_id
    WHERE s.slug = 'centraltienda'
    ORDER BY sub.created_at DESC
    LIMIT 1
) AS src
WHERE subscriptions.store_id = (SELECT id FROM stores WHERE slug = 'centraltiendacopia');

-- Fix morfiviandasprueba: copy subscription from morfiviandas
UPDATE subscriptions
SET
    plan_type      = src.plan_type,
    status         = src.status,
    current_period_start = src.current_period_start,
    current_period_end   = src.current_period_end,
    billing_cycle  = src.billing_cycle
FROM (
    SELECT sub.*
    FROM subscriptions sub
    JOIN stores s ON s.id = sub.store_id
    WHERE s.slug = 'morfiviandas'
    ORDER BY sub.created_at DESC
    LIMIT 1
) AS src
WHERE subscriptions.store_id = (SELECT id FROM stores WHERE slug = 'morfiviandasprueba');

-- Fix morfilaplata-copia: copy subscription from morfilaplata
UPDATE subscriptions
SET
    plan_type      = src.plan_type,
    status         = src.status,
    current_period_start = src.current_period_start,
    current_period_end   = src.current_period_end,
    billing_cycle  = src.billing_cycle
FROM (
    SELECT sub.*
    FROM subscriptions sub
    JOIN stores s ON s.id = sub.store_id
    WHERE s.slug = 'morfilaplata'
    ORDER BY sub.created_at DESC
    LIMIT 1
) AS src
WHERE subscriptions.store_id = (SELECT id FROM stores WHERE slug = 'morfilaplata-copia');

-- Verify the fix
SELECT s.slug, sub.plan_type, sub.status, sub.current_period_end
FROM stores s
JOIN subscriptions sub ON sub.store_id = s.id
WHERE s.slug IN ('centraltiendacopia', 'morfiviandasprueba', 'morfilaplata-copia',
                 'centraltienda', 'morfiviandas', 'morfilaplata')
ORDER BY s.slug;
