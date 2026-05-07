-- Migration 050: Fix morfiviandas.com.ar domain routing
--
-- Problem: morfiviandas.com.ar/laplata shows "Tienda no encontrada".
-- The domain-proxy worker queries:
--   custom_domain=morfiviandas.com.ar AND is_active=true
-- Returns 0 rows because either:
--   a) custom_domain / custom_path are not set on the morfilaplata store, or
--   b) is_active = false (store without active subscription or created after
--      migration 043 which mistakenly inserted stores with is_active=false)
--
-- Fix:
--   1. Set custom_domain + custom_path for morfilaplata → morfiviandas.com.ar/laplata
--   2. Set custom_domain for morfiviandas → morfiviandas.com.ar (root, hostname-based)
--   3. Ensure both stores are active
--   4. Fix handle_new_user trigger: new stores should start as is_active=true
--      (activation/deactivation is handled by payment webhooks after registration)

-- 1. Set domain routing for the La Plata store
UPDATE stores
SET
  custom_domain = 'morfiviandas.com.ar',
  custom_path   = 'laplata',
  is_active     = true
WHERE slug = 'morfilaplata';

-- 2. Set root domain for the main Morfi store (hostname-based, no path)
UPDATE stores
SET
  custom_domain = 'morfiviandas.com.ar',
  custom_path   = NULL,
  is_active     = true
WHERE slug = 'morfiviandas';

-- 3. Fix handle_new_user: new stores should start as active.
--    Payment webhooks (mp-webhook, stripe-webhook) handle deactivation when
--    subscriptions fail — there is no need to start inactive.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id   UUID;
  v_name       TEXT;
  v_slug       TEXT;
  v_final_slug TEXT;
  v_country    TEXT;
  v_city       TEXT;
  v_whatsapp   TEXT;
  v_attempt    INT := 0;
BEGIN
  v_name     := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'),     ''), split_part(NEW.email, '@', 1));
  v_slug     := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'slug'),     ''), split_part(NEW.email, '@', 1));
  v_country  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''), 'Argentina');
  v_city     := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'city'),    ''), '');
  v_whatsapp := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp'),''), '');
  v_final_slug := v_slug;

  BEGIN
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.stores WHERE slug = v_final_slug);
      v_attempt := v_attempt + 1;
      IF v_attempt > 5 THEN
        v_final_slug := v_slug || '-' || floor(random() * 9000 + 1000)::text;
        EXIT;
      END IF;
      v_final_slug := v_slug || '-' || v_attempt::text;
    END LOOP;

    INSERT INTO public.stores (name, slug, email, whatsapp, country, city, owner_id, is_active)
    VALUES (v_name, v_final_slug, NEW.email, v_whatsapp, v_country, v_city, NEW.id, true)
    RETURNING id INTO v_store_id;

    INSERT INTO public.profiles (id, email, role, store_id)
    VALUES (NEW.id, NEW.email, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client'), v_store_id)
    ON CONFLICT (id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Store creation failed for user % (%): %',
      NEW.id, NEW.email, SQLERRM;
    BEGIN
      INSERT INTO public.profiles (id, email, role)
      VALUES (NEW.id, NEW.email, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client'))
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] Profile fallback also failed for user %: %', NEW.id, SQLERRM;
    END;
  END;

  RETURN NEW;
END;
$$;
