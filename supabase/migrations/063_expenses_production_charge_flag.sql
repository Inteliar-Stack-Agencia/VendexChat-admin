-- "Ya cargaste $X esta semana" (Producción → Cargar como gasto) identificaba sus propios
-- gastos buscando el texto exacto "Ingreso de viandas..."/"Ingreso de bebidas..." en la
-- descripción. Si el usuario editaba la descripción para que fuera más clara (ej. "Lima
-- ensaladas 3/8 al 7/8" en vez de "Ingreso de viandas del 3/8 al 7/8"), el sistema dejaba
-- de reconocerla y volvía a marcar todo como pendiente de cargar.
-- Se agrega un flag explícito, independiente del texto, para identificar estos gastos.
alter table expenses add column if not exists production_charge boolean not null default false;
