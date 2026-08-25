PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PREMIUM')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  legacy_supabase_user_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS auth_identity_mapping (
  clerk_user_id TEXT PRIMARY KEY,
  application_user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  migration_state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (migration_state IN ('PENDING', 'ACTIVE', 'FAILED')),
  created_at TEXT NOT NULL,
  migrated_at TEXT
);

CREATE INDEX IF NOT EXISTS auth_identity_mapping_application_user_id_idx
  ON auth_identity_mapping(application_user_id);
