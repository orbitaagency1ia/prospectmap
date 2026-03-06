create table if not exists public.account_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sector text not null default '',
  target_verticals text[] not null default '{}'::text[],
  target_subsectors text[] not null default '{}'::text[],
  ideal_customer_profile jsonb not null default '{}'::jsonb,
  offer_profile jsonb not null default '{}'::jsonb,
  pricing_profile jsonb not null default '{}'::jsonb,
  prospecting_preferences jsonb not null default '{}'::jsonb,
  knowledge_base_text text not null default '',
  knowledge_summary jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_profiles_user_sector_idx
  on public.account_profiles(user_id, sector);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_account_profiles_updated_at on public.account_profiles;
create trigger set_account_profiles_updated_at
before update on public.account_profiles
for each row execute function public.set_updated_at();

insert into public.account_profiles (user_id)
select id
from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  city_lat_raw text;
  city_lng_raw text;
begin
  city_lat_raw := coalesce(new.raw_user_meta_data ->> 'city_lat', '');
  city_lng_raw := coalesce(new.raw_user_meta_data ->> 'city_lng', '');

  insert into public.profiles (id, email, company_name, city_name, city_lat, city_lng)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'company_name', ''),
    coalesce(new.raw_user_meta_data ->> 'city_name', ''),
    case
      when city_lat_raw ~ '^[-+]?[0-9]*\.?[0-9]+$' then city_lat_raw::double precision
      else null
    end,
    case
      when city_lng_raw ~ '^[-+]?[0-9]*\.?[0-9]+$' then city_lng_raw::double precision
      else null
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    company_name = excluded.company_name,
    city_name = excluded.city_name,
    city_lat = excluded.city_lat,
    city_lng = excluded.city_lng,
    updated_at = timezone('utc', now());

  insert into public.account_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.account_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

alter table public.account_profiles enable row level security;

drop policy if exists "account_profiles_select_own" on public.account_profiles;
create policy "account_profiles_select_own"
  on public.account_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "account_profiles_insert_own" on public.account_profiles;
create policy "account_profiles_insert_own"
  on public.account_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "account_profiles_update_own" on public.account_profiles;
create policy "account_profiles_update_own"
  on public.account_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "account_profiles_delete_own" on public.account_profiles;
create policy "account_profiles_delete_own"
  on public.account_profiles
  for delete
  using (auth.uid() = user_id);
