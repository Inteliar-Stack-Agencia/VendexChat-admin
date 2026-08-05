-- Categoría manual del cliente (distinta de los segmentos automáticos por comportamiento
-- como VIP/Frecuente) — para poder marcar clientes que en realidad son de empresa y
-- encontrarlos rápido entre el resto de clientes particulares.
alter table customers add column if not exists customer_type text not null default 'individual';
