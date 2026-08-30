-- FUT Forge Trader — Milestone 1 foundations only.
--
-- No table here ever stores an execution/run state beyond DRAFT/ARCHIVED
-- (trader_sessions.status) - M1 forbids real bids, purchases, listings,
-- relists or SBC submits, so there is nothing yet for a RUNNING/PAUSED/
-- STOPPED value to mean. Adding those is a later migration, not a value
-- change to this one.
--
-- Entitlement itself is NOT a new table: trader.access/auto_bid/auto_trade/
-- sniping/sbc are plain FeatureId values resolved through the existing
-- entitlement_overrides table (0003_admin_control_plane.sql) via
-- src/lib/entitlements.ts - see src/lib/trader/access.ts.

CREATE TABLE IF NOT EXISTS trader_consent (
  application_user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('ACCEPTED','REJECTED')),
  decided_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trader_user_settings (
  application_user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  speed_mode TEXT NOT NULL DEFAULT 'safe' CHECK (speed_mode IN ('safe','normal','turbo')),
  post_purchase_action TEXT NOT NULL DEFAULT 'none' CHECK (post_purchase_action IN ('none','list','send_to_transfer_list')),
  stop_after_event TEXT CHECK (stop_after_event IS NULL OR stop_after_event IN ('buys','searches','minutes')),
  stop_after_value INTEGER CHECK (stop_after_value IS NULL OR stop_after_value > 0),
  max_card_price INTEGER CHECK (max_card_price IS NULL OR max_card_price >= 0),
  min_profit_amount INTEGER CHECK (min_profit_amount IS NULL OR min_profit_amount >= 0),
  min_profit_percent REAL CHECK (min_profit_percent IS NULL OR (min_profit_percent >= 0 AND min_profit_percent <= 100)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trader_break_settings (
  application_user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  breaks_after_searches INTEGER NOT NULL DEFAULT 100 CHECK (breaks_after_searches > 0),
  breaks_seconds INTEGER NOT NULL DEFAULT 60 CHECK (breaks_seconds >= 0),
  longer_breaks_after_searches INTEGER CHECK (longer_breaks_after_searches IS NULL OR longer_breaks_after_searches > 0),
  longer_breaks_seconds INTEGER CHECK (longer_breaks_seconds IS NULL OR longer_breaks_seconds >= 0),
  randomize_percent INTEGER NOT NULL DEFAULT 0 CHECK (randomize_percent BETWEEN 0 AND 100),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trader_filter_groups (
  id TEXT PRIMARY KEY,
  application_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trader_filter_groups_user_idx ON trader_filter_groups(application_user_id);

CREATE TABLE IF NOT EXISTS trader_filters (
  id TEXT PRIMARY KEY,
  application_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES trader_filter_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  criteria TEXT NOT NULL, -- JSON, validated against TraderMarketCriteria (src/lib/trader/contract.ts) before every write
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trader_filters_user_idx ON trader_filters(application_user_id);
CREATE INDEX IF NOT EXISTS trader_filters_group_idx ON trader_filters(group_id);

CREATE TABLE IF NOT EXISTS trader_presets (
  id TEXT PRIMARY KEY,
  application_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('auto_bid','auto_trade')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  config TEXT NOT NULL, -- JSON, validated against TraderAutoBidConfig/TraderAutoTradeConfig before every write
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trader_presets_user_idx ON trader_presets(application_user_id);

CREATE TABLE IF NOT EXISTS trader_sessions (
  id TEXT PRIMARY KEY,
  application_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('search','auto_bid','auto_trade')),
  -- M1: only non-executing states exist. Do not add RUNNING/PAUSED/STOPPED
  -- to this CHECK constraint until an engine that can legitimately produce
  -- them ships - see CONTRACT.md "Reserved, not implemented".
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ARCHIVED')),
  config TEXT NOT NULL, -- JSON snapshot of the session's contract-validated config at creation time
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trader_sessions_user_idx ON trader_sessions(application_user_id,status);

CREATE TABLE IF NOT EXISTS trader_session_metrics (
  application_user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  total_searches INTEGER NOT NULL DEFAULT 0,
  total_bids INTEGER NOT NULL DEFAULT 0,
  total_success_bids INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
