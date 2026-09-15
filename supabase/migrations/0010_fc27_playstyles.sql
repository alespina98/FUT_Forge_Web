-- FC27 PlayStyles are an EA-owned array on each real-footballer record.
-- Keep the normalized, filterable projection alongside the unmodified
-- player_abilities_raw payload retained for provenance/display.
alter table public.fc27_players
  add column if not exists playstyles jsonb not null default '[]'::jsonb;

comment on column public.fc27_players.playstyles is
  'Normalized EA PlayStyles: [{"eaId": string, "tier": "base"|"plus"}]. player_abilities_raw preserves the full source payload.';

create index if not exists fc27_players_playstyles_gin
  on public.fc27_players using gin (playstyles jsonb_path_ops);
