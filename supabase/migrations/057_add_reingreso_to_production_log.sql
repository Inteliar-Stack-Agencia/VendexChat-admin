-- Sobrante de la semana anterior que sigue en buen estado y se vuelve a poner a la venta.
-- Se suma al stock disponible de la semana (para que "Vendido real" cierre bien si se
-- termina vendiendo), pero NO cuenta como costo nuevo de producción — ya se pagó cuando
-- se cocinó la semana pasada, así que no debe generar un gasto nuevo en "Cargar como gasto".
ALTER TABLE production_log ADD COLUMN reingreso integer NOT NULL DEFAULT 0;
