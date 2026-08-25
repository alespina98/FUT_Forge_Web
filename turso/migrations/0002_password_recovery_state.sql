BEGIN IMMEDIATE;

CREATE TABLE auth_identity_mapping_next (
  clerk_user_id TEXT PRIMARY KEY,
  application_user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  migration_state TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (migration_state IN ('PENDING', 'PASSWORD_RECOVERY_REQUIRED', 'ACTIVE', 'FAILED')),
  created_at TEXT NOT NULL,
  migrated_at TEXT
);

INSERT INTO auth_identity_mapping_next
  (clerk_user_id, application_user_id, migration_state, created_at, migrated_at)
SELECT clerk_user_id, application_user_id, migration_state, created_at, migrated_at
FROM auth_identity_mapping;

DROP TABLE auth_identity_mapping;
ALTER TABLE auth_identity_mapping_next RENAME TO auth_identity_mapping;

CREATE INDEX auth_identity_mapping_application_user_id_idx
  ON auth_identity_mapping(application_user_id);

COMMIT;
