-- Migration 027: Fix two storefront issues
--
-- Issue 1: morfiviandas has products with base64 image_url (~834KB each = 76MB total)
--   get_catalog was timing out trying to serialize 76MB of JSON.
--   Fix: exclude base64 data URLs from the response (they start with 'data:')
--
-- Issue 2: Cloned stores (centraltiendacopia, morfiviandasprueba, etc.) fail to load
--   even when they have normal-sized data. Root cause: cloneTenant sets
--   owner_id = sourceStore.owner_id on the new store. If there is a UNIQUE constraint
--   on stores.owner_id, the update silently fails and the store record is left
--   with is_active = false or in an inconsistent state set by the auth trigger.
--   Fix: ensure get_catalog works regardless of is_active, and return the store
--   even if something in the clone process left it partially set up.

CREATE OR REPLACE FUNCTION public.get_catalog(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store       JSONB;
  v_store_id    UUID;
  v_categories  JSONB;
  v_products    JSONB;
BEGIN
  -- Find the store by slug (no is_active filter — storefront handles that)
  SELECT to_jsonb(s), s.id
    INTO v_store, v_store_id
    FROM stores s
   WHERE s.slug = p_slug
   LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Store not found: %', p_slug
      USING ERRCODE = 'P0002';
  END IF;

  -- Fetch categories ordered by sort_order
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',         c.id,
        'name',       c.name,
        'sort_order', c.sort_order
      )
      ORDER BY c.sort_order ASC NULLS LAST, c.name ASC
    ),
    '[]'::jsonb
  )
    INTO v_categories
    FROM categories c
   WHERE c.store_id = v_store_id;

  -- Fetch only active products
  -- IMPORTANT: base64 image_url values (starting with 'data:') are replaced with NULL
  -- to avoid returning tens of megabytes of base64 data that causes timeouts.
  -- Images should be stored in Supabase Storage, not as base64 in the products table.
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',              p.id,
        'name',            p.name,
        'description',     p.description,
        'price',           p.price,
        'image_url',       CASE
                             WHEN p.image_url LIKE 'data:%' THEN NULL
                             ELSE p.image_url
                           END,
        'stock',           p.stock,
        'unlimited_stock', p.unlimited_stock,
        'category_id',     p.category_id,
        'is_featured',     p.is_featured,
        'sort_order',      p.sort_order,
        'created_at',      p.created_at
      )
      ORDER BY p.sort_order ASC NULLS LAST, p.created_at DESC
    ),
    '[]'::jsonb
  )
    INTO v_products
    FROM products p
   WHERE p.store_id = v_store_id
     AND p.is_active = true;

  RETURN jsonb_build_object(
    'store',      v_store,
    'categories', v_categories,
    'products',   v_products
  );
END;
$$;

-- Grants remain the same
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO authenticated;
