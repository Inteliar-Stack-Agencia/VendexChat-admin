-- Registro manual de plata vendida por producto y día — reemplaza el intento de derivar
-- "ventas" desde Pedidos (que Morfi decidió no usar para esto). Se carga a mano, como el
-- resto de las planillas semanales (Producción, Cierre de Stock).
CREATE TABLE sales_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date date NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, date, product_id)
);

ALTER TABLE sales_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_owner ON sales_log
  FOR ALL
  USING (store_id = my_store_id())
  WITH CHECK (store_id = my_store_id());

CREATE INDEX idx_sales_log_store_date ON sales_log(store_id, date);
