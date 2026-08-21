-- FUT Forge FC27 footballer database. Review and run manually in the
-- Supabase SQL editor, same convention as every prior migration in this repo.
--
-- fc27_players represents REAL FOOTBALLERS from EA's official FC27 ratings
-- catalog (https://www.ea.com/games/ea-sports-fc/ratings) - it does NOT
-- represent Ultimate Team card/item variants. A real footballer can have
-- many UT cards later (base, TOTW, promo, ...):
--
--   fc27_players (this table, 1 row per EA ratings player_id)
--       |
--       | 1
--       |
--       N
--   fc27_items (NOT created by this migration - deferred until a genuine
--               UT item identity source is separately audited; no item ID
--               is invented here)
--
-- Every row in this table was validated against the complete, official
-- 20,689-record EA snapshot before this migration was written (see the
-- FC27 Step 2B/3 audit reports) - column types, nullability and CHECK
-- constraints below reflect that real distribution, not assumptions
-- carried over from FC26.

create table public.fc27_players (
  ea_player_id bigint primary key,
  -- Deliberately NOT unique - multiple players can share a computed slug.
  -- ea_player_id is the authoritative identity; slug is cosmetic/SEO only
  -- (see the /fc27/players/{ea_player_id}-{slug} routing convention).
  slug text not null,
  first_name text not null,
  last_name text not null,
  common_name text,             -- 15.28% populated in the full snapshot
  display_name text not null,   -- common_name if present, else "first last"

  overall smallint not null check (overall between 0 and 99),
  rank integer not null check (rank > 0),

  -- The six face stats live as real columns, not just inside JSONB, so the
  -- future /fc27/players page can filter/sort on them directly in SQL.
  -- CHECK bounds use EA's well-established 0-99 rating domain rather than
  -- this launch snapshot's observed 15-96 spread, so a legitimate future
  -- value just outside today's range is never rejected.
  pace smallint check (pace between 0 and 99),
  shooting smallint check (shooting between 0 and 99),
  passing smallint check (passing between 0 and 99),
  dribbling smallint check (dribbling between 0 and 99),
  defending smallint check (defending between 0 and 99),
  physicality smallint check (physicality between 0 and 99),
  -- EA's rating-change indicator per face stat, e.g. {"pace":0,"shooting":0,...}.
  -- Uniformly 0 across all 20,689 current records (nothing to diff against
  -- yet, this is FC27's launch snapshot) - kept as compact JSONB rather
  -- than six more columns since nothing today needs to filter/sort by a
  -- diff value, only display it; the source values are still preserved.
  face_stat_diffs jsonb not null default '{}'::jsonb,

  -- position.id/positionType.id are EA string codes (e.g. "25", "attack"),
  -- not integers - preserved as text, not coerced.
  position_id text not null,
  position_short_label text not null,
  position_label text not null,
  position_type_id text,
  position_type_name text,
  -- Array of {id, label, short_label} objects, IDs included - never
  -- flattened to label-only. Empty for the 35.22% of players with no
  -- alternate position.
  alternate_positions jsonb not null default '[]'::jsonb,

  nationality_id integer not null,
  nationality_name text not null,
  nationality_image_url text,

  -- Nullable: 16.64% of players have no club_id (free agents/unattached).
  club_id integer,
  club_name text,
  club_image_url text,
  club_is_popular boolean,

  -- Text only, by design - EA exposes no league ID anywhere in the source
  -- (audited across the complete snapshot). Do not invent one here.
  league_name text,

  -- 100% of the snapshot parses as an unambiguous M/D/YYYY date (verified:
  -- the first component never exceeds 12, ruling out D/M/YYYY ambiguity;
  -- the time component is always a constant "0:00"). Safe as a real date.
  birthdate date not null,

  -- Raw EA source value, observed as {2,3,4,5,6} in the current snapshot -
  -- NOT the classic 1-5 scale. No upper bound is enforced: this column
  -- represents whatever EA sends, and an arbitrary EA maximum must never
  -- be invented here just because today's snapshot tops out at 6.
  skill_moves_raw smallint not null check (skill_moves_raw >= 0),
  weak_foot smallint not null check (weak_foot between 1 and 5),
  -- Raw EA source code (currently only 1 and 2 observed). EA documents no
  -- enum for this anywhere in the public payload, so no closed-set CHECK
  -- is enforced here - a cross-check against 10 independently-scraped
  -- players with known human-readable feet (Kane=Right/1, Messi=Left/2,
  -- ... 10/10 consistent) strongly suggests 1=Right, 2=Left, but that is
  -- empirical evidence, not an EA-published contract. Application code
  -- may interpret known values later; this column stays the raw source.
  preferred_foot_code smallint not null check (preferred_foot_code >= 0),

  -- Always empty-string in the current EA launch snapshot (verified across
  -- all 20,689 records) - stored as NULL rather than a meaningless ''.
  -- Populated automatically by a future sync once/if EA starts sending
  -- real values; no CHECK constraint narrow enough to reject plausible
  -- future heights/weights.
  height_cm smallint,
  weight_kg smallint,

  -- 29 detailed sub-attributes (100% populated) plus 5 GK stats (also
  -- 100% populated for every player, not just goalkeepers) - kept as
  -- JSONB since the players list/database page doesn't need 25+ separate
  -- columns; only player-detail pages and future analysis need these.
  detailed_attributes jsonb not null,
  goalkeeping jsonb not null,

  -- PlayStyles: 20,689/20,689 = [] in the current snapshot (EA hasn't
  -- populated them yet). Schema is ready; no normalized playstyle rows
  -- are created until EA actually exposes ability data.
  player_abilities_raw jsonb not null default '[]'::jsonb,

  -- Source references only - FUT Forge does not mirror/download EA's
  -- image files. If official asset use isn't confirmed later, FUT Forge
  -- renders its own player-card UI instead of these URLs.
  avatar_url text,
  shield_url text,

  source_ea_build_id text not null,
  source_retrieved_at timestamptz not null,
  -- sha256 of the canonical EA-sourced fields (excludes created_at/
  -- updated_at AND search_text - see the importer's comment on
  -- buildSearchText for why) - drives future incremental sync change
  -- detection: same hash means unchanged/skip, different hash means
  -- UPDATE, unseen ea_player_id means INSERT.
  data_hash text not null,

  -- Application-generated (scripts/fc27/sync-fc27-players.ts), NOT a
  -- generated SQL column: accent-folded (Unicode NFD, combining marks
  -- stripped), lowercased, whitespace-normalized concatenation of the same
  -- fields search_document indexes - "Mbappe" needs to find "Mbappé", and
  -- Postgres's 'simple' text-search config does not fold accents. Deriving
  -- this in JS avoids the unaccent extension entirely, per instruction.
  -- Always non-empty: display_name/first_name/last_name are never null.
  search_text text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Search: reuses the same tsvector/GIN approach already proven in
  -- 0002_leaks_foundation.sql (public.leaks.search_document) - no
  -- extension required (unlike pg_trgm), and this is the first thing to
  -- reach for before considering anything heavier at 20,689 rows. Indexes
  -- search_text (already accent-folded and already covers name/
  -- nationality/club/league/position text) rather than re-concatenating
  -- the raw accented columns here, so there's exactly one place - the
  -- importer - that decides what's searchable, not two. Deliberately
  -- excludes the JSONB attribute/goalkeeping/ability blobs.
  -- to_tsvector('simple', ...) with a literal config name is IMMUTABLE,
  -- which a STORED generated column requires.
  search_document tsvector generated always as (
    to_tsvector('simple', search_text)
  ) stored
);

comment on table public.fc27_players is 'Real FC27 footballers from EA''s official public ratings catalog. Not Ultimate Team card/item variants - see the header comment on this migration for the future fc27_items relationship.';
comment on column public.fc27_players.slug is 'Cosmetic/SEO only, deliberately not unique. ea_player_id is the authoritative identity.';
comment on column public.fc27_players.league_name is 'Text only - EA exposes no stable league ID in the source. Do not add league_id without a confirmed source.';
comment on column public.fc27_players.preferred_foot_code is 'Raw EA code (1 or 2). No EA-documented label mapping exists; see migration header comment for the empirical (not authoritative) cross-check.';

create index fc27_players_search_idx on public.fc27_players using gin (search_document);
create index fc27_players_slug_idx on public.fc27_players (slug);
create index fc27_players_overall_idx on public.fc27_players (overall desc);
create index fc27_players_rank_idx on public.fc27_players (rank);
create index fc27_players_position_short_label_idx on public.fc27_players (position_short_label);
create index fc27_players_nationality_id_idx on public.fc27_players (nationality_id);
create index fc27_players_club_id_idx on public.fc27_players (club_id);
create index fc27_players_league_name_idx on public.fc27_players (league_name);
create index fc27_players_pace_idx on public.fc27_players (pace desc);
create index fc27_players_shooting_idx on public.fc27_players (shooting desc);
create index fc27_players_passing_idx on public.fc27_players (passing desc);
create index fc27_players_dribbling_idx on public.fc27_players (dribbling desc);
create index fc27_players_defending_idx on public.fc27_players (defending desc);
create index fc27_players_physicality_idx on public.fc27_players (physicality desc);
-- position_id and nationality_name/club_name deliberately have no index of
-- their own: position_id and position_short_label encode the same
-- partition (one index covers both use cases), and name-text filters ride
-- on the search_document GIN index above rather than a plain btree.

alter table public.fc27_players enable row level security;
create policy "Public reads fc27 players" on public.fc27_players for select to anon, authenticated using (true);
revoke insert, update, delete, truncate, references, trigger on public.fc27_players from anon, authenticated;
grant select on public.fc27_players to anon, authenticated;

-- Reuses the existing generic updated_at trigger function from
-- 0002_leaks_foundation.sql rather than creating a duplicate helper.
create trigger fc27_players_updated_at before update on public.fc27_players
  for each row execute function public.futforge_leaks_set_updated_at();

-- Internal operational metadata for the importer - never publicly
-- readable, service-role only (same posture as club_snapshots/club_items
-- in FUT_Forge/supabase/migrations/0001_club_sync.sql: explicit revoke
-- first, since a Supabase project's schema-level default privileges can
-- otherwise grant anon/authenticated more than intended).
create table public.fc27_sync_state (
  source text primary key,
  ea_build_id text,
  snapshot_sha256 text,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  discovered_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fc27_sync_state enable row level security;
revoke all on table public.fc27_sync_state from anon, authenticated;
-- No policies at all: RLS with zero policies denies every row to anon/
-- authenticated by default. service_role bypasses RLS entirely (Supabase
-- convention), so the importer needs no explicit grant here.

create trigger fc27_sync_state_updated_at before update on public.fc27_sync_state
  for each row execute function public.futforge_leaks_set_updated_at();
