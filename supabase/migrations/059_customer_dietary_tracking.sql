-- Notas médicas/dieta separadas de las notas internas genéricas, y flag para marcar
-- clientes que requieren seguimiento nutricional activo (ej. rotar platos para que no
-- coman siempre lo mismo).
alter table customers add column if not exists dietary_notes text;
alter table customers add column if not exists needs_diet_tracking boolean not null default false;
