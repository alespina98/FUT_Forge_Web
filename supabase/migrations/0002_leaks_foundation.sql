-- FUT Forge Leaks foundation. Review and run manually in Supabase SQL editor.
create extension if not exists pgcrypto;

create table public.leak_categories (
  code text primary key check (code ~ '^[A-Z][A-Z0-9_]*$'),
  sort_order smallint not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.leak_categories (code, sort_order) values ('PLAYER',10),('SBC',20),('EVOLUTION',30),('PROMO',40),('OBJECTIVE',50),('PACK',60),('OTHER',70);

create table public.leak_confidence_levels (
  code text primary key check (code ~ '^[A-Z][A-Z0-9_]*$'),
  rank smallint not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.leak_confidence_levels (code, rank) values ('RUMOR',10),('LIKELY',20),('CONFIRMED',30);

create table public.leak_source_types (
  code text primary key check (code ~ '^[A-Z][A-Z0-9_]*$'),
  description text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.leak_source_types (code, description) values
  ('FUT_FORGE_DISCOVERY', 'First-party proprietary FUT Forge discovery'),
  ('EA_CLIENT_VISIBLE', 'Data visible through an authorized EA client experience'),
  ('EA_OFFICIAL_PUBLIC', 'Official or publicly released EA information'),
  ('EDITORIAL', 'Manual FUT Forge editorial input'),
  ('EXTERNAL_SOCIAL', 'Third-party social source'),
  ('EXTERNAL_OTHER', 'Other external source');

create table public.leak_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null references public.leak_source_types(code),
  handle text,
  platform text not null,
  url text,
  enabled boolean not null default true,
  reliability numeric(4,3) not null default 0.500 check (reliability between 0 and 1),
  priority integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, handle)
);

create table public.leaks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  short_description text not null,
  content text not null,
  content_locale text not null default 'en',
  translations jsonb not null default '{}'::jsonb,
  category text not null references public.leak_categories(code),
  confidence text not null references public.leak_confidence_levels(code),
  normalized_subject text not null,
  event_key text,
  deduplication_key text not null unique,
  image_url text,
  player_metadata jsonb,
  channel_metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  search_document tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(content,'') || ' ' || coalesce(normalized_subject,'') || ' ' || translations::text)) stored,
  check (not is_published or published_at is not null),
  check (published_at is null or published_at >= first_seen_at),
  check (player_metadata is null or jsonb_typeof(player_metadata) = 'object'),
  check (jsonb_typeof(translations) = 'object'),
  check (jsonb_typeof(channel_metadata) = 'object')
);

create table public.leak_reports (
  id uuid primary key default gen_random_uuid(),
  leak_id uuid not null references public.leaks(id) on delete cascade,
  source_id uuid not null references public.leak_sources(id),
  original_source_id text,
  source_url text,
  source_payload jsonb not null default '{}'::jsonb,
  normalized_subject text not null,
  event_key text,
  excerpt text,
  reported_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(source_payload) = 'object')
);

create index leaks_public_feed_idx on public.leaks (published_at desc) where is_published;
create index leaks_category_confidence_idx on public.leaks (category, confidence, published_at desc) where is_published;
create index leaks_search_idx on public.leaks using gin (search_document);
create index leaks_subject_match_idx on public.leaks (normalized_subject, category, event_key);
create index leak_reports_leak_idx on public.leak_reports (leak_id, reported_at);
create index leak_reports_match_idx on public.leak_reports (normalized_subject, event_key, reported_at);
create unique index leak_reports_external_identity_idx on public.leak_reports (source_id, original_source_id) where original_source_id is not null;

create function public.futforge_leaks_set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger futforge_leak_sources_updated_at before update on public.leak_sources for each row execute function public.futforge_leaks_set_updated_at();
create trigger futforge_leaks_updated_at before update on public.leaks for each row execute function public.futforge_leaks_set_updated_at();
revoke all on function public.futforge_leaks_set_updated_at() from public, anon, authenticated;

alter table public.leak_categories enable row level security;
alter table public.leak_confidence_levels enable row level security;
alter table public.leak_source_types enable row level security;
alter table public.leak_sources enable row level security;
alter table public.leaks enable row level security;
alter table public.leak_reports enable row level security;

create policy "Public reads enabled leak categories" on public.leak_categories for select to anon, authenticated using (enabled);
create policy "Public reads enabled confidence levels" on public.leak_confidence_levels for select to anon, authenticated using (enabled);
create policy "Public reads enabled leak source types" on public.leak_source_types for select to anon, authenticated using (enabled);
create policy "Public reads sources attached to published leaks" on public.leak_sources for select to anon, authenticated using (enabled and exists (select 1 from public.leak_reports r join public.leaks l on l.id = r.leak_id where r.source_id = leak_sources.id and l.is_published and l.published_at <= now()));
create policy "Public reads published leaks" on public.leaks for select to anon, authenticated using (is_published and published_at <= now());
create policy "Public reads reports for published leaks" on public.leak_reports for select to anon, authenticated using (exists (select 1 from public.leaks l where l.id = leak_reports.leak_id and l.is_published and l.published_at <= now()));

revoke insert, update, delete, truncate, references, trigger on public.leak_categories, public.leak_confidence_levels, public.leak_source_types, public.leak_sources, public.leaks, public.leak_reports from anon, authenticated;
grant select on public.leak_categories, public.leak_confidence_levels, public.leak_source_types, public.leak_sources, public.leaks, public.leak_reports to anon, authenticated;

comment on table public.leaks is 'Canonical cross-channel FUT Forge leak/news records.';
comment on column public.leaks.channel_metadata is 'Optional channel-neutral publishing hints for future Web, Desktop, extension and Telegram renderers.';
comment on column public.leaks.deduplication_key is 'Deterministic manual-friendly identity: category + player/resource/normalized subject + event.';
