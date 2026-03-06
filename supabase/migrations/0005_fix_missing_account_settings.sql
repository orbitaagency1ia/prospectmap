alter table public.businesses
  add column if not exists vertical_override text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_vertical_override_check'
  ) then
    alter table public.businesses
      add constraint businesses_vertical_override_check
      check (vertical_override in ('autoescuelas', 'clinicas', 'hoteles', 'general_b2b'));
  end if;
end;
$$;

create table if not exists public.account_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vertical text not null default 'general_b2b' check (vertical in ('autoescuelas', 'clinicas', 'hoteles', 'general_b2b')),
  demo_mode boolean not null default false,
  scoring_config jsonb not null default '{}'::jsonb,
  commercial_preferences jsonb not null default '{"preferred_outreach":"mixto","sales_narrative":"captacion"}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists businesses_user_vertical_override_idx
  on public.businesses(user_id, vertical_override);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_account_settings_updated_at on public.account_settings;
create trigger set_account_settings_updated_at
before update on public.account_settings
for each row execute function public.set_updated_at();

insert into public.account_settings (user_id)
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

  if to_regclass('public.account_profiles') is not null then
    execute
      'insert into public.account_profiles (user_id) values ($1) on conflict (user_id) do nothing'
      using new.id;
  end if;

  return new;
end;
$$;

alter table public.account_settings enable row level security;

drop policy if exists "account_settings_select_own" on public.account_settings;
create policy "account_settings_select_own"
  on public.account_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "account_settings_insert_own" on public.account_settings;
create policy "account_settings_insert_own"
  on public.account_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "account_settings_update_own" on public.account_settings;
create policy "account_settings_update_own"
  on public.account_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "account_settings_delete_own" on public.account_settings;
create policy "account_settings_delete_own"
  on public.account_settings
  for delete
  using (auth.uid() = user_id);
