create table plans (
  id text primary key,
  name text not null,
  price_usd numeric not null default 0,
  annual_price_usd numeric not null default 0,
  features jsonb default '[]',
  is_active boolean default true,
  sort_order int default 0,
  updated_at timestamptz default now()
);

insert into plans (id, name, price_usd, annual_price_usd, sort_order) values
  ('free',  'Plan Free',  0,     0,      1),
  ('pro',   'Plan Pro',   13.99, 139.90, 2),
  ('vip',   'Plan VIP',   19.99, 199.90, 3),
  ('ultra', 'Plan Ultra', 0,     0,      4);

-- Allow superadmins to manage plans (service role has full access)
alter table plans enable row level security;

create policy "Public read plans" on plans
  for select using (true);

create policy "Service role manages plans" on plans
  for all using (auth.role() = 'service_role');
