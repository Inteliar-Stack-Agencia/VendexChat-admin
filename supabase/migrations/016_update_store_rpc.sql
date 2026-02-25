-- Migration: Allow users to update stores associated with their email
-- This is needed for multi-store users (same email, multiple stores)

-- 1. Create a SECURITY DEFINER function to update store settings
-- This bypasses RLS but validates that the caller owns the store
CREATE OR REPLACE FUNCTION public.update_my_store(
  p_store_id UUID,
  p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_user_id UUID;
  v_user_role TEXT;
  v_store_email TEXT;
  v_profile_store_id UUID;
  v_result JSONB;
BEGIN
  -- Get the calling user's info
  v_user_id := auth.uid();
  v_user_email := auth.jwt() ->> 'email';

  -- Get user's profile
  SELECT store_id, role INTO v_profile_store_id, v_user_role
  FROM profiles WHERE id = v_user_id;

  -- Get the target store's email
  SELECT email INTO v_store_email
  FROM stores WHERE id = p_store_id;

  IF v_store_email IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  -- Authorization check: user must be superadmin, own the store via profile, or share email
  IF v_user_role != 'superadmin' 
     AND v_profile_store_id != p_store_id 
     AND LOWER(v_store_email) != LOWER(v_user_email) THEN
    RAISE EXCEPTION 'Not authorized to update this store';
  END IF;

  -- Perform the update
  UPDATE stores
  SET
    name = COALESCE(p_data->>'name', name),
    slug = COALESCE(p_data->>'slug', slug),
    whatsapp = COALESCE(p_data->>'whatsapp', whatsapp),
    email = COALESCE(p_data->>'email', email),
    address = COALESCE(p_data->>'address', address),
    country = COALESCE(p_data->>'country', country),
    city = COALESCE(p_data->>'city', city),
    primary_color = COALESCE(p_data->>'primary_color', primary_color),
    welcome_message = COALESCE(p_data->>'welcome_message', welcome_message),
    footer_message = COALESCE(p_data->>'footer_message', footer_message),
    logo_url = COALESCE(p_data->>'logo_url', logo_url),
    banner_url = COALESCE(p_data->>'banner_url', banner_url),
    instagram = COALESCE(p_data->>'instagram', instagram),
    facebook = COALESCE(p_data->>'facebook', facebook),
    custom_domain = COALESCE(p_data->>'custom_domain', custom_domain),
    delivery_fee = COALESCE((p_data->>'delivery_fee')::numeric, delivery_fee),
    min_order = COALESCE((p_data->>'min_order')::numeric, min_order),
    free_delivery_from = COALESCE((p_data->>'free_delivery_from')::numeric, free_delivery_from),
    accepts_delivery = COALESCE((p_data->>'accepts_delivery')::boolean, accepts_delivery),
    accepts_pickup = COALESCE((p_data->>'accepts_pickup')::boolean, accepts_pickup),
    low_stock_threshold = COALESCE((p_data->>'low_stock_threshold')::integer, low_stock_threshold),
    coupons_enabled = COALESCE((p_data->>'coupons_enabled')::boolean, coupons_enabled),
    metadata = COALESCE(p_data->'metadata', metadata)
  WHERE id = p_store_id;

  -- Return the updated store
  SELECT to_jsonb(s) INTO v_result FROM stores s WHERE s.id = p_store_id;
  RETURN v_result;
END;
$$;
