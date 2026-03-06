alter table public.businesses
  add column if not exists next_follow_up_at timestamptz;

create index if not exists businesses_user_next_follow_up_idx
  on public.businesses(user_id, next_follow_up_at desc);

create table if not exists public.prospect_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  focus text not null default '',
  city_filter text,
  sector_filter text,
  service_focus text check (service_focus in ('asistente_multicanal', 'automatizacion_interna', 'avatar_ia', 'saas_a_medida')),
  status text not null default 'activa' check (status in ('borrador', 'activa', 'en_curso', 'completada', 'archivada')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prospect_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.prospect_lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (list_id, business_id)
);

create index if not exists prospect_lists_user_status_idx
  on public.prospect_lists(user_id, status, updated_at desc);

create index if not exists prospect_list_items_user_list_idx
  on public.prospect_list_items(user_id, list_id, created_at desc);

create index if not exists prospect_list_items_user_business_idx
  on public.prospect_list_items(user_id, business_id);

drop trigger if exists set_prospect_lists_updated_at on public.prospect_lists;
create trigger set_prospect_lists_updated_at
before update on public.prospect_lists
for each row execute function public.set_updated_at();

alter table public.prospect_lists enable row level security;
alter table public.prospect_list_items enable row level security;

drop policy if exists "prospect_lists_select_own" on public.prospect_lists;
create policy "prospect_lists_select_own"
  on public.prospect_lists
  for select
  using (auth.uid() = user_id);

drop policy if exists "prospect_lists_insert_own" on public.prospect_lists;
create policy "prospect_lists_insert_own"
  on public.prospect_lists
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "prospect_lists_update_own" on public.prospect_lists;
create policy "prospect_lists_update_own"
  on public.prospect_lists
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "prospect_lists_delete_own" on public.prospect_lists;
create policy "prospect_lists_delete_own"
  on public.prospect_lists
  for delete
  using (auth.uid() = user_id);

drop policy if exists "prospect_list_items_select_own" on public.prospect_list_items;
create policy "prospect_list_items_select_own"
  on public.prospect_list_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "prospect_list_items_insert_own" on public.prospect_list_items;
create policy "prospect_list_items_insert_own"
  on public.prospect_list_items
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.prospect_lists l
      where l.id = list_id
        and l.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "prospect_list_items_delete_own" on public.prospect_list_items;
create policy "prospect_list_items_delete_own"
  on public.prospect_list_items
  for delete
  using (auth.uid() = user_id);
