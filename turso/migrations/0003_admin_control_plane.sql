CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_application_user_id TEXT NOT NULL REFERENCES app_users(id),
  target_application_user_id TEXT NOT NULL REFERENCES app_users(id),
  action TEXT NOT NULL CHECK (action IN ('username_change','role_change','tier_change','entitlement_change')),
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_log_target_created_idx
  ON admin_audit_log(target_application_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS entitlement_overrides (
  application_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (application_user_id, feature_id)
);
