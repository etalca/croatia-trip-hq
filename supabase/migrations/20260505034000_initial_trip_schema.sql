-- Croatia Trip HQ Supabase schema
-- Existing launch behavior stays trust-based/name-selected, while leaving a clean path
-- for Supabase Auth magic links and richer group-planning features.

create extension if not exists "pgcrypto";

create table if not exists public.trip_guests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_access_tokens (
  token text primary key,
  guest_id uuid not null references public.trip_guests(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.flight_details (
  identity_key text primary key,
  guest_id uuid references public.trip_guests(id) on delete set null,
  guest_name text not null,
  flight_status text not null default '',
  arrival_date text not null default '',
  arrival_airport text not null default '',
  arrival_time text not null default '',
  arrival_flight text not null default '',
  departure_date text not null default '',
  departure_airport text not null default '',
  departure_time text not null default '',
  departure_flight text not null default '',
  flight_notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.grocery_requests (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.trip_guests(id) on delete set null,
  guest_name text not null,
  item text not null,
  quantity text not null default '',
  notes text not null default '',
  status text not null default 'requested' check (status in ('requested','planned','bought','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dinner_slots (
  id uuid primary key default gen_random_uuid(),
  dinner_date date not null unique,
  title text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dinner_signups (
  id uuid primary key default gen_random_uuid(),
  dinner_slot_id uuid not null references public.dinner_slots(id) on delete cascade,
  guest_id uuid references public.trip_guests(id) on delete set null,
  guest_name text not null,
  role text not null default 'cook' check (role in ('cook','helper','cleanup','bring','other')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (dinner_slot_id, guest_name, role)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references public.trip_guests(id) on delete set null,
  guest_name text not null,
  title text not null,
  description text not null default '',
  location text not null default '',
  day_hint text not null default '',
  link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_votes (
  activity_id uuid not null references public.activities(id) on delete cascade,
  guest_id uuid references public.trip_guests(id) on delete set null,
  guest_name text not null,
  vote_value smallint not null default 1 check (vote_value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (activity_id, guest_name)
);

create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  guest_id uuid references public.trip_guests(id) on delete set null,
  guest_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'touch_trip_guests_updated_at') then
    create trigger touch_trip_guests_updated_at before update on public.trip_guests
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'touch_grocery_requests_updated_at') then
    create trigger touch_grocery_requests_updated_at before update on public.grocery_requests
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'touch_dinner_slots_updated_at') then
    create trigger touch_dinner_slots_updated_at before update on public.dinner_slots
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'touch_activities_updated_at') then
    create trigger touch_activities_updated_at before update on public.activities
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'touch_activity_votes_updated_at') then
    create trigger touch_activity_votes_updated_at before update on public.activity_votes
    for each row execute function public.touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'touch_activity_comments_updated_at') then
    create trigger touch_activity_comments_updated_at before update on public.activity_comments
    for each row execute function public.touch_updated_at();
  end if;
end $$;

insert into public.trip_guests (name) values
  ('Tanner'), ('David'), ('Jacob G.'), ('Jacob M.'), ('Mikaela'),
  ('Candace'), ('Kaelin'), ('Mark'), ('Amanda'), ('Ellie'),
  ('Erika'), ('Andie'), ('Zach'), ('Kait'), ('Nick')
on conflict (name) do nothing;

alter table public.trip_guests enable row level security;
alter table public.guest_access_tokens enable row level security;
alter table public.flight_details enable row level security;
alter table public.grocery_requests enable row level security;
alter table public.dinner_slots enable row level security;
alter table public.dinner_signups enable row level security;
alter table public.activities enable row level security;
alter table public.activity_votes enable row level security;
alter table public.activity_comments enable row level security;

-- For now the public site talks through Vercel serverless API routes using the
-- server-side service role key. Browser clients do not need direct table access.
-- Magic-link auth can later add scoped policies for authenticated users.
