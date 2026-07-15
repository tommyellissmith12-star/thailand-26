-- Thailand '26 family moodboard schema
-- Run this once in the Supabase SQL editor (before seed.sql).

create type pin_category as enum ('food','beach','temple','island','activity','stay','town','other');
create type pin_status   as enum ('idea','shortlist','stamped');

-- 6 fixed family members, seeded with stable ids that the app hardcodes.
create table members (
  id          uuid primary key,
  name        text not null unique,
  avatar      text not null,
  color       text not null,
  is_approver boolean not null default false
);

create table pins (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) <= 120),
  description text check (length(description) <= 4000),
  lat         double precision not null,
  lng         double precision not null,
  category    pin_category not null default 'other',
  status      pin_status   not null default 'idea',
  created_by  uuid not null references members(id),
  stamped_by  uuid references members(id),
  created_at  timestamptz not null default now()
);

create table pin_images (
  id           uuid primary key default gen_random_uuid(),
  pin_id       uuid not null references pins(id) on delete cascade,
  storage_path text not null,
  thumb_path   text,
  width        int,
  height       int,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table pin_links (
  id             uuid primary key default gen_random_uuid(),
  pin_id         uuid not null references pins(id) on delete cascade,
  url            text not null,
  og_title       text,
  og_description text,
  og_image       text,
  og_site_name   text,
  fetched_ok     boolean not null default false,
  created_at     timestamptz not null default now()
);

create table reactions (
  pin_id     uuid not null references pins(id) on delete cascade,
  member_id  uuid not null references members(id),
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (pin_id, member_id, emoji)
);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  pin_id     uuid not null references pins(id) on delete cascade,
  member_id  uuid not null references members(id),
  body       text not null check (length(body) <= 2000),
  created_at timestamptz not null default now()
);

-- Trip days live in code (Dec 27 2026 onwards); items reference the date directly.
create table itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  pin_id     uuid not null references pins(id) on delete cascade,
  sort_order int not null default 0,
  note       text,
  unique (day, pin_id)
);

-- Permissive RLS: the real gate is the family PIN at the app layer.
-- Enabled now so tightening later is a policy edit, not a migration.
alter table members         enable row level security;
alter table pins            enable row level security;
alter table pin_images      enable row level security;
alter table pin_links       enable row level security;
alter table reactions       enable row level security;
alter table comments        enable row level security;
alter table itinerary_items enable row level security;

create policy "family all" on members         for all to anon using (true) with check (true);
create policy "family all" on pins            for all to anon using (true) with check (true);
create policy "family all" on pin_images      for all to anon using (true) with check (true);
create policy "family all" on pin_links       for all to anon using (true) with check (true);
create policy "family all" on reactions       for all to anon using (true) with check (true);
create policy "family all" on comments        for all to anon using (true) with check (true);
create policy "family all" on itinerary_items for all to anon using (true) with check (true);

-- Realtime: without this the live-sync channel silently receives nothing.
alter publication supabase_realtime add table pins, reactions, comments, itinerary_items;

-- Storage bucket for photos (public read; the app pre-compresses to webp).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pin-images', 'pin-images', true, 5242880, array['image/jpeg','image/png','image/webp']);

create policy "family upload" on storage.objects
  for insert to anon with check (bucket_id = 'pin-images');
create policy "family read" on storage.objects
  for select to anon using (bucket_id = 'pin-images');
create policy "family delete" on storage.objects
  for delete to anon using (bucket_id = 'pin-images');
