create table if not exists public.attack_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default '',
  source text not null default 'daily_queue' check (source in ('daily_queue', 'list', 'territory', 'priorities', 'pipeline', 'alerts', 'manual')),
  source_ref text,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  queue_filters jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attack_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attack_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  position integer not null default 0,
  queue_reason text not null default '',
  why_today text[] not null default '{}'::text[],
  zone_key text,
  zone_label text,
  pinned_for_today boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'worked', 'skipped', 'dismissed')),
  last_worked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, business_id)
);

create table if not exists public.attack_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.attack_sessions(id) on delete set null,
  session_item_id uuid references public.attack_session_items(id) on delete set null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  result text not null check (result in ('no_contactado', 'contacto_intentado', 'hablo_con_alguien', 'interesado', 'reunion_conseguida', 'propuesta_pendiente', 'no_encaja', 'perdido', 'volver_mas_tarde')),
  note_text text,
  follow_up_at timestamptz,
  priority_after text check (priority_after in ('alta', 'media', 'baja')),
  suggested_next_step text,
  suggested_due_at timestamptz,
  moved_to_pipeline boolean not null default false,
  added_to_list_id uuid references public.prospect_lists(id) on delete set null,
  discarded boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists attack_sessions_user_status_started_idx
  on public.attack_sessions(user_id, status, started_at desc);

create index if not exists attack_session_items_session_position_idx
  on public.attack_session_items(session_id, position, updated_at desc);

create index if not exists attack_session_items_user_status_idx
  on public.attack_session_items(user_id, status, updated_at desc);

create index if not exists attack_results_user_created_idx
  on public.attack_results(user_id, created_at desc);

create index if not exists attack_results_business_created_idx
  on public.attack_results(user_id, business_id, created_at desc);

drop trigger if exists set_attack_sessions_updated_at on public.attack_sessions;
create trigger set_attack_sessions_updated_at
before update on public.attack_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_attack_session_items_updated_at on public.attack_session_items;
create trigger set_attack_session_items_updated_at
before update on public.attack_session_items
for each row execute function public.set_updated_at();

alter table public.attack_sessions enable row level security;
alter table public.attack_session_items enable row level security;
alter table public.attack_results enable row level security;

drop policy if exists "attack_sessions_select_own" on public.attack_sessions;
create policy "attack_sessions_select_own"
  on public.attack_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "attack_sessions_insert_own" on public.attack_sessions;
create policy "attack_sessions_insert_own"
  on public.attack_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "attack_sessions_update_own" on public.attack_sessions;
create policy "attack_sessions_update_own"
  on public.attack_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "attack_sessions_delete_own" on public.attack_sessions;
create policy "attack_sessions_delete_own"
  on public.attack_sessions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "attack_session_items_select_own" on public.attack_session_items;
create policy "attack_session_items_select_own"
  on public.attack_session_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "attack_session_items_insert_own" on public.attack_session_items;
create policy "attack_session_items_insert_own"
  on public.attack_session_items
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.attack_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "attack_session_items_update_own" on public.attack_session_items;
create policy "attack_session_items_update_own"
  on public.attack_session_items
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.attack_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "attack_session_items_delete_own" on public.attack_session_items;
create policy "attack_session_items_delete_own"
  on public.attack_session_items
  for delete
  using (auth.uid() = user_id);

drop policy if exists "attack_results_select_own" on public.attack_results;
create policy "attack_results_select_own"
  on public.attack_results
  for select
  using (auth.uid() = user_id);

drop policy if exists "attack_results_insert_own" on public.attack_results;
create policy "attack_results_insert_own"
  on public.attack_results
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.user_id = auth.uid()
    )
    and (
      session_id is null
      or exists (
        select 1
        from public.attack_sessions s
        where s.id = session_id
          and s.user_id = auth.uid()
      )
    )
    and (
      session_item_id is null
      or exists (
        select 1
        from public.attack_session_items i
        where i.id = session_item_id
          and i.user_id = auth.uid()
      )
    )
    and (
      added_to_list_id is null
      or exists (
        select 1
        from public.prospect_lists l
        where l.id = added_to_list_id
          and l.user_id = auth.uid()
      )
    )
  );

drop policy if exists "attack_results_delete_own" on public.attack_results;
create policy "attack_results_delete_own"
  on public.attack_results
  for delete
  using (auth.uid() = user_id);
