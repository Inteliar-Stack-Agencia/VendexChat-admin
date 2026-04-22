-- Restore INSERT access for anonymous users (storefront) on orders and order_items.
-- The security audit correctly removed overly-broad public policies, but the storefront
-- (anon key) needs to be able to place orders without being logged in.
--
-- SELECT is also needed so that INSERT ... RETURNING ... works (Postgres routes
-- RETURNING through the SELECT policy). We scope it to valid store_ids only.

-- orders
CREATE POLICY "Storefront anon: insert orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (store_id IN (SELECT id FROM public.stores));

CREATE POLICY "Storefront anon: select own orders"
  ON public.orders FOR SELECT TO anon
  USING (store_id IN (SELECT id FROM public.stores));

-- order_items
CREATE POLICY "Storefront anon: insert order_items"
  ON public.order_items FOR INSERT TO anon
  WITH CHECK (order_id IN (SELECT id FROM public.orders));

CREATE POLICY "Storefront anon: select order_items"
  ON public.order_items FOR SELECT TO anon
  USING (order_id IN (SELECT id FROM public.orders));
