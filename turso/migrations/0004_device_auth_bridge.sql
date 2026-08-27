CREATE TABLE IF NOT EXISTS device_authorizations (
  id TEXT PRIMARY KEY,
  device_code_hash TEXT NOT NULL UNIQUE,
  user_code TEXT NOT NULL UNIQUE,
  client_type TEXT NOT NULL CHECK (client_type IN ('desktop','android','extension','browser')),
  client_version TEXT,
  requester_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','DENIED','EXPIRED','CONSUMED')),
  application_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  clerk_user_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  approved_at TEXT,
  consumed_at TEXT,
  last_polled_at TEXT,
  poll_interval INTEGER NOT NULL DEFAULT 5,
  poll_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS device_authorizations_expiry_idx ON device_authorizations(status,expires_at);
CREATE INDEX IF NOT EXISTS device_authorizations_requester_idx ON device_authorizations(requester_hash,status,expires_at);

CREATE TABLE IF NOT EXISTS device_refresh_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  family_id TEXT NOT NULL,
  application_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_type TEXT NOT NULL CHECK (client_type IN ('desktop','android','extension','browser')),
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ROTATED','REVOKED','REUSED')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  rotated_at TEXT,
  revoked_at TEXT,
  replaced_by TEXT
);
CREATE INDEX IF NOT EXISTS device_refresh_family_idx ON device_refresh_tokens(family_id,status);
CREATE INDEX IF NOT EXISTS device_refresh_expiry_idx ON device_refresh_tokens(status,expires_at);

CREATE TABLE IF NOT EXISTS device_auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  attempts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS device_auth_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('START','APPROVE','DENY','EXPIRE','TOKEN_SUCCESS','TOKEN_FAILURE','REFRESH_SUCCESS','REFRESH_FAILURE','LOGOUT')),
  client_type TEXT CHECK (client_type IN ('desktop','android','extension','browser')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS device_auth_events_created_idx ON device_auth_events(created_at);
