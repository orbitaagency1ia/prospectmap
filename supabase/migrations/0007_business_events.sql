-- Phase 7: commercial activity event log

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'business_saved',
      'business_updated',
      'status_changed',
      'priority_changed',
      'follow_up_scheduled',
      'note_added',
      'attack_result_logged'
    )
  ),
  title text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists business_events_user_business_created_idx
  on public.business_events(user_id, business_id, created_at desc);

create index if not exists business_events_user_created_idx
  on public.business_events(user_id, created_at desc);

alter table public.business_events enable row level security;

drop policy if exists "business_events_select_own" on public.business_events;
create policy "business_events_select_own"
  on public.business_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "business_events_insert_own" on public.business_events;
create policy "business_events_insert_own"
  on public.business_events
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "business_events_delete_own" on public.business_events;
create policy "business_events_delete_own"
  on public.business_events
  for delete
  using (auth.uid() = user_id);

