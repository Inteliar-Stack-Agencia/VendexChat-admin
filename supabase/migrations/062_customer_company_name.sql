-- Nombre de la empresa a la que pertenece un cliente marcado como "Empresa" — texto
-- libre (con sugerencias en la UI desde company_clients) en vez de un FK estricto,
-- porque company_clients es por tienda y un mismo cliente/empresa puede aparecer en
-- varias tiendas del mismo dueño con registros de company_clients distintos.
alter table customers add column if not exists company_name text;
