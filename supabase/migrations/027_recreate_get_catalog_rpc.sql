-- Migration 027: Recreate get_catalog RPC
-- The get_catalog function was created outside the migration system and has been
-- crashing with 500 errors (likely referencing columns added/changed since creation).
-- This migration recreates it with the current full schema.

CREATE OR REPLACE FUNCTION public.get_catalog(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_id UUID;
    v_store    JSONB;
    v_cats     JSONB;
    v_products JSONB;
BEGIN
    -- 1. Resolve store by slug (only active stores are publicly visible)
    SELECT id INTO v_store_id
    FROM stores
    WHERE slug = p_slug
      AND is_active = true
    LIMIT 1;

    IF v_store_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Store data (full row — storefront selects what it needs client-side)
    SELECT to_jsonb(s) INTO v_store
    FROM stores s
    WHERE s.id = v_store_id;

    -- 3. Categories ordered by sort_order
    SELECT COALESCE(jsonb_agg(c ORDER BY c.sort_order ASC, c.name ASC), '[]'::jsonb)
    INTO v_cats
    FROM categories c
    WHERE c.store_id = v_store_id;

    -- 4. Active products ordered by sort_order
    SELECT COALESCE(jsonb_agg(p ORDER BY p.sort_order ASC, p.name ASC), '[]'::jsonb)
    INTO v_products
    FROM products p
    WHERE p.store_id = v_store_id
      AND p.is_active = true;

    RETURN jsonb_build_object(
        'store',      v_store,
        'categories', v_cats,
        'products',   v_products
    );
END;
$$;

-- Grant execution to anonymous users (public storefront doesn't require login)
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO authenticated;
