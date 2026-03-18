-- Migration 026: Add get_catalog RPC function for the public storefront
-- The storefront calls rpc/get_catalog to load store data, categories, and active products
-- in a single request. Without this function, the storefront returns 500 errors.

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
  -- Find the store by slug
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
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',              p.id,
        'name',            p.name,
        'description',     p.description,
        'price',           p.price,
        'image_url',       p.image_url,
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

-- Grant execution to both unauthenticated (anon) and authenticated users
-- so the public storefront can load without requiring a login
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_catalog(TEXT) TO authenticated;
