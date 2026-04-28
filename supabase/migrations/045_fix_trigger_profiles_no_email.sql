-- Migration 045: Fix handle_new_user trigger — profiles table has no email column
--
-- Root cause: migrations 043 and 044 inserted email into public.profiles, but that
-- column does not exist. The EXCEPTION block silently swallowed the error, so stores
-- were created but profiles were never created. Without a profile row the user's RLS
-- policy returns no stores, breaking the dashboard entirely.

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

    -- profiles does NOT have an email column — only id, role, store_id
    INSERT INTO public.profiles (id, role, store_id)
    VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client'), v_store_id)
    ON CONFLICT (id) DO UPDATE SET store_id = EXCLUDED.store_id;

    INSERT INTO public.subscriptions (store_id, plan_type, status, current_period_end, billing_cycle)
    VALUES (v_store_id, 'free', 'trial', NOW() + INTERVAL '25 days', 'monthly')
    ON CONFLICT (store_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Failed for user % (%): %', NEW.id, NEW.email, SQLERRM;
    BEGIN
      INSERT INTO public.profiles (id, role)
      VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client'))
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] Profile fallback failed for user %: %', NEW.id, SQLERRM;
    END;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
