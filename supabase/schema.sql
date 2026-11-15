-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run

create table if not exists public.servicos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
create table if not exists public.pedidos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
create table if not exists public.precos (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
create table if not exists public.lojistas (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table public.servicos enable row level security;
alter table public.pedidos  enable row level security;
alter table public.precos   enable row level security;
alter table public.lojistas enable row level security;

-- Somente usuários logados (os 2 sócios) podem ler e gravar
create policy "socios_servicos" on public.servicos for all to authenticated using (true) with check (true);
create policy "socios_pedidos"  on public.pedidos  for all to authenticated using (true) with check (true);
create policy "socios_precos"   on public.precos   for all to authenticated using (true) with check (true);
create policy "socios_lojistas" on public.lojistas for all to authenticated using (true) with check (true);
