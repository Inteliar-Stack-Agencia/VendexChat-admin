-- Conteo rápido diario de stock por producto (unidades que quedan hoy). No reemplaza
-- al Cierre de Stock semanal (que desglosa sobrante/consumo/merma) — es un chequeo
-- veloz para comparar, día a día, unidades vendidas (conteo de ayer + producido hoy -
-- conteo de hoy) contra lo cobrado en Caja ese mismo día.
CREATE TABLE daily_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id, date)
);

ALTER TABLE daily_stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_owner ON daily_stock_counts
  FOR ALL
  USING (store_id = my_store_id())
  WITH CHECK (store_id = my_store_id());

CREATE INDEX idx_daily_stock_counts_store_date ON daily_stock_counts(store_id, date);
