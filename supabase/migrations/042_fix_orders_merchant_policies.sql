-- Add SELECT, UPDATE and DELETE policies for authenticated merchants on their own orders.
-- The security audit left only superadmin DELETE; merchants couldn't archive or delete.

-- orders: full access for store owner
CREATE POLICY "Merchants can manage their own orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- order_items: full access for store owner (via parent order)
CREATE POLICY "Merchants can manage their own order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders
    WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
  ))
  WITH CHECK (order_id IN (
    SELECT id FROM public.orders
    WHERE store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
  ));

-- Superadmin: full access to all orders and order_items
CREATE POLICY "Superadmin can manage all orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

CREATE POLICY "Superadmin can manage all order_items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));
