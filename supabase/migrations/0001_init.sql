-- ProspectMap MVP schema (Supabase)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text not null default '',
  city_name text not null default '',
  city_lat double precision,
  city_lng double precision,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('overpass', 'csv', 'manual')),
  external_source_id text,
  vertical_override text check (vertical_override in ('autoescuelas', 'clinicas', 'hoteles', 'general_b2b')),
  name text not null,
  address text,
  city text,
  category text,
  phone text,
  email text,
  website text,
  opening_hours text,
  lat double precision not null,
  lng double precision not null,
  owner_name text,
  owner_role text,
  direct_phone text,
  direct_email text,
  contact_notes text,
  prospect_status text not null default 'sin_contactar' check (
    prospect_status in (
      'sin_contactar',
      'intento_contacto',
      'contactado',
      'reunion_agendada',
      'propuesta_enviada',
      'negociacion',
      'ganado',
      'perdido',
      'bloqueado'
    )
  ),
  priority text not null default 'media' check (priority in ('alta', 'media', 'baja')),
  last_contact_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.account_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vertical text not null default 'general_b2b' check (vertical in ('autoescuelas', 'clinicas', 'hoteles', 'general_b2b')),
  demo_mode boolean not null default false,
  scoring_config jsonb not null default '{}'::jsonb,
  commercial_preferences jsonb not null default '{"preferred_outreach":"mixto","sales_narrative":"captacion"}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  note_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.csv_import_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  raw_name text,
  raw_address text,
  raw_phone text,
  raw_email text,
  raw_category text,
  raw_contact_name text,
  raw_notes text,
  error_reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists businesses_user_external_idx
  on public.businesses(user_id, external_source_id)
  where external_source_id is not null;

create index if not exists businesses_user_status_idx
  on public.businesses(user_id, prospect_status);

create index if not exists businesses_user_priority_idx
  on public.businesses(user_id, priority);

create index if not exists businesses_user_category_idx
  on public.businesses(user_id, category);

create index if not exists businesses_user_updated_idx
  on public.businesses(user_id, updated_at desc);

create index if not exists businesses_user_vertical_override_idx
  on public.businesses(user_id, vertical_override);

create index if not exists business_notes_user_business_idx
  on public.business_notes(user_id, business_id, created_at desc);

create index if not exists csv_import_errors_user_created_idx
  on public.csv_import_errors(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.touch_business_on_note()
returns trigger
language plpgsql
as $$
begin
  update public.businesses
  set updated_at = timezone('utc', now())
  where id = new.business_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists set_account_settings_updated_at on public.account_settings;
create trigger set_account_settings_updated_at
before update on public.account_settings
for each row execute function public.set_updated_at();

drop trigger if exists touch_business_when_note_created on public.business_notes;
create trigger touch_business_when_note_created
after insert on public.business_notes
for each row execute function public.touch_business_on_note();

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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.account_settings enable row level security;
alter table public.business_notes enable row level security;
alter table public.csv_import_errors enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "businesses_select_own" on public.businesses;
create policy "businesses_select_own"
  on public.businesses
  for select
  using (auth.uid() = user_id);

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own"
  on public.businesses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own"
  on public.businesses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "businesses_delete_own" on public.businesses;
create policy "businesses_delete_own"
  on public.businesses
  for delete
  using (auth.uid() = user_id);

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

drop policy if exists "business_notes_select_own" on public.business_notes;
create policy "business_notes_select_own"
  on public.business_notes
  for select
  using (auth.uid() = user_id);

drop policy if exists "business_notes_insert_own" on public.business_notes;
create policy "business_notes_insert_own"
  on public.business_notes
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

drop policy if exists "business_notes_delete_own" on public.business_notes;
create policy "business_notes_delete_own"
  on public.business_notes
  for delete
  using (auth.uid() = user_id);

drop policy if exists "csv_import_errors_select_own" on public.csv_import_errors;
create policy "csv_import_errors_select_own"
  on public.csv_import_errors
  for select
  using (auth.uid() = user_id);

drop policy if exists "csv_import_errors_insert_own" on public.csv_import_errors;
create policy "csv_import_errors_insert_own"
  on public.csv_import_errors
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "csv_import_errors_delete_own" on public.csv_import_errors;
create policy "csv_import_errors_delete_own"
  on public.csv_import_errors
  for delete
  using (auth.uid() = user_id);
