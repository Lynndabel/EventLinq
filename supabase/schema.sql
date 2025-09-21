-- Supabase schema for Event Matchmaker
-- Run this in Supabase SQL Editor

create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  role text,
  company text,
  bio text,
  interests text[] default '{}',
  goals text[] default '{}',
  availability text,
  channel text default 'web',
  consent_intro boolean default false,
  email text,
  event_id uuid,
  telegram text,
  x_handle text
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  attendee_id uuid references attendees(id) on delete cascade,
  partner_id uuid references attendees(id) on delete cascade,
  score double precision default 0,
  rationale text
);

create table if not exists intros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  a_id uuid references attendees(id) on delete cascade,
  b_id uuid references attendees(id) on delete cascade,
  status text check (status in ('proposed','accepted','declined','met')) default 'proposed'
);

-- Basic indexes
create index if not exists idx_matches_attendee on matches(attendee_id);
create index if not exists idx_matches_partner on matches(partner_id);
create index if not exists idx_intros_pair on intros(a_id, b_id);

-- Events to scope matching
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text unique not null,
  name text
);

create index if not exists idx_attendees_event on attendees(event_id);
