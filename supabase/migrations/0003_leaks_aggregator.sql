-- Source-agnostic ingestion additions for the FUT Forge Leaks foundation.
alter table public.leaks add column if not exists game text not null default 'FC26';
alter table public.leaks add column if not exists status text not null default 'LEAKED';
alter table public.leaks add column if not exists fingerprint text;
alter table public.leaks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.leaks drop constraint if exists leaks_game_check;
alter table public.leaks add constraint leaks_game_check check (game in ('FC26', 'FC27'));
alter table public.leaks drop constraint if exists leaks_status_check;
alter table public.leaks add constraint leaks_status_check check (status in ('LEAKED', 'CONFIRMED', 'OFFICIAL'));
alter table public.leaks drop constraint if exists leaks_metadata_object_check;
alter table public.leaks add constraint leaks_metadata_object_check check (jsonb_typeof(metadata) = 'object');
create index if not exists leaks_published_at_idx on public.leaks (published_at desc);
create index if not exists leaks_category_idx on public.leaks (category);
create index if not exists leaks_status_idx on public.leaks (status);
create index if not exists leaks_fingerprint_idx on public.leaks (fingerprint) where fingerprint is not null;
create index if not exists leak_sources_name_idx on public.leak_sources (name);

create table if not exists public.leak_ingestion_runs (
  id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null default 'RUNNING' check (status in ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED')),
  provider_results jsonb not null default '[]'::jsonb check (jsonb_typeof(provider_results) = 'array'),
  created_count integer not null default 0, attached_count integer not null default 0, skipped_count integer not null default 0
);
alter table public.leak_ingestion_runs enable row level security;
revoke all on public.leak_ingestion_runs from anon, authenticated;
comment on column public.leaks.fingerprint is 'Conservative cross-source fingerprint; attribution remains in leak_reports.';
comment on table public.leak_ingestion_runs is 'Server-only observability for scheduled leak ingestion.';
