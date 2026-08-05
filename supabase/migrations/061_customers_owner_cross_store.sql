-- Permite al dueño de las tiendas leer/escribir clientes de CUALQUIERA de sus tiendas,
-- no solo la que tiene activa en profiles.store_id — necesario para que categorías
-- manuales como "Empresa" se puedan sincronizar por WhatsApp entre todas sus tiendas
-- (setCustomerType en customersApi.ts).
create policy "owner_cross_store_customers"
  on customers
  for all
  using (exists (select 1 from stores where stores.id = customers.store_id and stores.owner_id = auth.uid()))
  with check (exists (select 1 from stores where stores.id = customers.store_id and stores.owner_id = auth.uid()));
