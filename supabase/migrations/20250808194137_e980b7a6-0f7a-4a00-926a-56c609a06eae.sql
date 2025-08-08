-- 1) Create table for provider credentials per plant
create table public.plant_credentials (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  provider text not null,
  username text,
  password text,
  appkey text,
  access_key text,
  base_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plant_id, provider)
);

-- 2) Enable RLS
alter table public.plant_credentials enable row level security;

-- 3) Admin-only policies (view and manage)
create policy "Admins can view plant credentials"
  on public.plant_credentials for select
  using (get_user_role(auth.uid()) in ('super_admin','admin'));

create policy "Admins can manage plant credentials"
  on public.plant_credentials for all
  using (get_user_role(auth.uid()) in ('super_admin','admin'))
  with check (get_user_role(auth.uid()) in ('super_admin','admin'));

-- 4) Updated_at trigger
create trigger update_plant_credentials_updated_at
before update on public.plant_credentials
for each row execute function public.update_updated_at_column();