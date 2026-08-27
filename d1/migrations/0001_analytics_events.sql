CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  ts INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  client_type TEXT NOT NULL,
  client_version TEXT,
  install_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  properties TEXT
);

CREATE INDEX idx_analytics_events_ts ON analytics_events(ts);
CREATE INDEX idx_analytics_events_event_ts ON analytics_events(event, ts);
CREATE INDEX idx_analytics_events_client_ts ON analytics_events(client_type, ts);
CREATE INDEX idx_analytics_events_install ON analytics_events(install_id);

CREATE TABLE analytics_daily_rollup (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  client_type TEXT NOT NULL,
  client_version TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL,
  distinct_install_count INTEGER NOT NULL,
  distinct_user_count INTEGER NOT NULL,
  PRIMARY KEY (day, event, client_type, client_version)
);

CREATE INDEX idx_analytics_rollup_day ON analytics_daily_rollup(day);
