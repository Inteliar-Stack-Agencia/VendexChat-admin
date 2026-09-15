-- La política de SELECT para "anon" en orders/order_items dejaba leer CUALQUIER
-- pedido de CUALQUIER tienda (store_id IN (select id from stores) es siempre
-- verdadero) — la intención original (migración 041) era solo permitir que el
-- storefront lea de vuelta el pedido que ACABA de crear (para que insert().select()
-- funcione), pero la condición no lo limitaba a eso. Como la clave anon es pública
-- (va en el bundle del storefront), cualquiera podía leer todo el historial de
-- pedidos de todas las tiendas (nombre, whatsapp, dirección, notas, montos).
--
-- Se acota a pedidos creados en los últimos 5 minutos — el insert+select del
-- checkout sigue funcionando (pasa en el mismo request), pero ya no se puede leer
-- el histórico completo.

DROP POLICY IF EXISTS "Storefront anon: select own orders" ON public.orders;

CREATE POLICY "Storefront anon: select own orders"
  ON public.orders FOR SELECT TO anon
  USING (
    store_id IN (SELECT id FROM public.stores)
    AND created_at > now() - interval '5 minutes'
  );

DROP POLICY IF EXISTS "Storefront anon: select order_items" ON public.order_items;

CREATE POLICY "Storefront anon: select order_items"
  ON public.order_items FOR SELECT TO anon
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE created_at > now() - interval '5 minutes'
    )
  );
