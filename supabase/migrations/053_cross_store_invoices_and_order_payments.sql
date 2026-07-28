-- Permite que una tienda hermana (mismo owner) lea las facturas de otra tienda,
-- igual que ya pueden company_clients y company_dispatches. Esto habilita que
-- CABA (tienda con stock/cocina real) sume en su P&L las facturas generadas
-- desde Empresas (tienda de despacho B2B sin stock propio).
CREATE POLICY "owner_cross_store_read" ON company_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = company_invoices.store_id
      AND stores.owner_id = auth.uid()
  )
);

-- Permite marcar un pedido suelto (sin factura de empresa) como pagado/parcial,
-- y registrar el monto real cobrado cuando difiere del total del pedido
-- (descuentos, negociación puntual). Usado por CABA y La Plata.
ALTER TABLE orders
  ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  ADD COLUMN paid_amount DECIMAL(10, 2),
  ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN payment_notes TEXT;

CREATE INDEX idx_orders_payment_status ON orders(store_id, payment_status);
CREATE INDEX idx_orders_paid_at ON orders(store_id, paid_at);
