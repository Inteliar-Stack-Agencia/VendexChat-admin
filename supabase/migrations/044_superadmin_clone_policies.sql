-- Migration 044: Add superadmin RLS policies for categories and products
--
-- Problem: cloneTenant reads categories and products from the source store using
-- the anon key (authenticated as superadmin). Without explicit superadmin policies,
-- RLS blocks the SELECT on any store the superadmin doesn't own directly, so
-- categories and products return empty — the clone is created with no catalog.
--
-- Fix: Add superadmin bypass policies to categories and products so the clone
-- operation can read from any source store.

-- Categories: allow superadmin full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'categories' AND policyname = 'superadmin_categories_all'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "superadmin_categories_all" ON public.categories
                FOR ALL
                USING (
                    EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE id = auth.uid() AND role = 'superadmin'
                    )
                )
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE id = auth.uid() AND role = 'superadmin'
                    )
                )
        $policy$;
        RAISE NOTICE 'Created superadmin policy on categories';
    END IF;
END $$;

-- Products: allow superadmin full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'products' AND policyname = 'superadmin_products_all'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "superadmin_products_all" ON public.products
                FOR ALL
                USING (
                    EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE id = auth.uid() AND role = 'superadmin'
                    )
                )
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE id = auth.uid() AND role = 'superadmin'
                    )
                )
        $policy$;
        RAISE NOTICE 'Created superadmin policy on products';
    END IF;
END $$;

-- Also fix Morfi Empresas (the broken clone): copy categories and products
-- from morfiviandas to morfiempresas since they were not cloned due to this bug.
DO $$
DECLARE
    v_source_id UUID;
    v_dest_id   UUID;
    cat         RECORD;
    new_cat_id  UUID;
BEGIN
    SELECT id INTO v_source_id FROM public.stores WHERE slug = 'morfiviandas' LIMIT 1;
    -- Try common slug variants for Morfi Empresas
    SELECT id INTO v_dest_id FROM public.stores
    WHERE slug IN ('morfiempresas', 'morfi-empresas', 'morfiviandas-empresas', 'morfi-empresas-caba')
       OR name ILIKE '%morfi%empresas%'
    LIMIT 1;

    IF v_source_id IS NULL OR v_dest_id IS NULL THEN
        RAISE NOTICE 'Source or destination store not found, skipping product copy';
        RETURN;
    END IF;

    -- Only proceed if the destination has no categories yet
    IF EXISTS (SELECT 1 FROM public.categories WHERE store_id = v_dest_id LIMIT 1) THEN
        RAISE NOTICE 'morfiempresas already has categories, skipping';
        RETURN;
    END IF;

    FOR cat IN
        SELECT * FROM public.categories WHERE store_id = v_source_id ORDER BY sort_order
    LOOP
        INSERT INTO public.categories (store_id, name, sort_order)
        VALUES (v_dest_id, cat.name, cat.sort_order)
        RETURNING id INTO new_cat_id;

        INSERT INTO public.products (
            store_id, category_id, name, description, price,
            stock, unlimited_stock, image_url, is_active, is_featured, sort_order
        )
        SELECT
            v_dest_id, new_cat_id, name, description, price,
            stock, unlimited_stock, image_url, is_active, is_featured, sort_order
        FROM public.products
        WHERE category_id = cat.id;
    END LOOP;

    RAISE NOTICE 'Copied categories and products from morfiviandas to morfiempresas';
END $$;
