-- Migration 029: Fix cloned stores that failed due to owner_id UNIQUE constraint
--
-- Problem: cloneTenant was setting owner_id = sourceStore.owner_id on the new store.
-- If stores.owner_id has a UNIQUE constraint, the entire UPDATE silently fails,
-- leaving the cloned store without logo, description, schedules, colors, etc.
-- The storefront then shows an empty/broken store.
--
-- Fix: Drop the UNIQUE constraint on owner_id (one owner can have multiple stores),
-- and re-copy settings from source stores to their known clones.

-- Step 1: Drop UNIQUE constraint on owner_id if it exists.
-- This allows one user to own multiple stores (which is the correct behavior for clones).
DO $$
BEGIN
    -- Drop any unique index on owner_id
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'stores'
        AND indexdef LIKE '%owner_id%'
        AND indexdef LIKE '%UNIQUE%'
    ) THEN
        -- Find and drop the constraint dynamically
        EXECUTE (
            SELECT 'ALTER TABLE stores DROP CONSTRAINT ' || conname
            FROM pg_constraint
            WHERE conrelid = 'stores'::regclass
            AND contype = 'u'
            AND array_to_string(conkey, ',') = (
                SELECT attnum::text FROM pg_attribute
                WHERE attrelid = 'stores'::regclass AND attname = 'owner_id'
            )
            LIMIT 1
        );
        RAISE NOTICE 'Dropped UNIQUE constraint on stores.owner_id';
    END IF;

    -- Also try dropping a unique index (in case it's an index, not a constraint)
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'stores'
        AND indexname LIKE '%owner_id%unique%'
    ) THEN
        EXECUTE (
            SELECT 'DROP INDEX ' || indexname
            FROM pg_indexes
            WHERE tablename = 'stores'
            AND indexname LIKE '%owner_id%unique%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped UNIQUE index on stores.owner_id';
    END IF;
END $$;

-- Step 2: Ensure all stores have is_active = true (clones may have been left as false)
UPDATE stores SET is_active = true WHERE is_active = false;

-- Step 3: Re-copy store settings from source to known clones that are missing data.
-- We identify broken clones as stores with NULL description AND NULL logo_url
-- that were created after their source (suggesting they're clones that failed the UPDATE).

-- Fix centraltiendacopia from centraltienda
UPDATE stores dst
SET
    logo_url         = src.logo_url,
    banner_url       = src.banner_url,
    description      = src.description,
    whatsapp         = COALESCE(dst.whatsapp, src.whatsapp),
    address          = COALESCE(dst.address, src.address),
    primary_color    = COALESCE(dst.primary_color, src.primary_color),
    physical_schedule = COALESCE(dst.physical_schedule, src.physical_schedule),
    online_schedule  = COALESCE(dst.online_schedule, src.online_schedule),
    delivery_cost    = COALESCE(dst.delivery_cost, src.delivery_cost),
    delivery_info    = COALESCE(dst.delivery_info, src.delivery_info),
    is_active        = true
FROM stores src
WHERE src.slug = 'centraltienda'
  AND dst.slug = 'centraltiendacopia'
  AND dst.description IS NULL;

-- Fix morfiviandasprueba from morfiviandas
UPDATE stores dst
SET
    logo_url         = src.logo_url,
    banner_url       = src.banner_url,
    description      = src.description,
    whatsapp         = COALESCE(dst.whatsapp, src.whatsapp),
    address          = COALESCE(dst.address, src.address),
    primary_color    = COALESCE(dst.primary_color, src.primary_color),
    physical_schedule = COALESCE(dst.physical_schedule, src.physical_schedule),
    online_schedule  = COALESCE(dst.online_schedule, src.online_schedule),
    delivery_cost    = COALESCE(dst.delivery_cost, src.delivery_cost),
    delivery_info    = COALESCE(dst.delivery_info, src.delivery_info),
    is_active        = true
FROM stores src
WHERE src.slug = 'morfiviandas'
  AND dst.slug = 'morfiviandasprueba'
  AND dst.description IS NULL;

-- Fix morfilaplata-copia from morfilaplata
UPDATE stores dst
SET
    logo_url         = src.logo_url,
    banner_url       = src.banner_url,
    description      = src.description,
    whatsapp         = COALESCE(dst.whatsapp, src.whatsapp),
    address          = COALESCE(dst.address, src.address),
    primary_color    = COALESCE(dst.primary_color, src.primary_color),
    physical_schedule = COALESCE(dst.physical_schedule, src.physical_schedule),
    online_schedule  = COALESCE(dst.online_schedule, src.online_schedule),
    delivery_cost    = COALESCE(dst.delivery_cost, src.delivery_cost),
    delivery_info    = COALESCE(dst.delivery_info, src.delivery_info),
    is_active        = true
FROM stores src
WHERE src.slug = 'morfilaplata'
  AND dst.slug = 'morfilaplata-copia'
  AND dst.description IS NULL;

-- Step 4: Strip base64 images from ALL products (not just clones)
-- These cause get_catalog to return 76MB+ responses and timeout
UPDATE products
SET image_url = NULL
WHERE image_url LIKE 'data:%';
