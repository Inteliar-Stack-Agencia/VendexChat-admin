-- Ventas de mostrador que salieron de stock (bajó la heladera) pero nunca se cargaron
-- como Pedido en el sistema, así que no había forma de saber cuánto ni por qué canal
-- se cobró. Este es un ajuste manual semanal por producto para conciliar esa plata
-- contra "Diferencia sin explicar" del Cierre de Stock.
CREATE TABLE manual_stock_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  channel text NOT NULL CHECK (channel IN ('efectivo', 'transferencia', 'qr', 'tarjeta')),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE manual_stock_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_owner ON manual_stock_sales
  FOR ALL
  USING (store_id = my_store_id())
  WITH CHECK (store_id = my_store_id());

CREATE INDEX idx_manual_stock_sales_store_week ON manual_stock_sales(store_id, week_start);
