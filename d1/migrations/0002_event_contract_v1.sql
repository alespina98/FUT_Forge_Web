ALTER TABLE analytics_events ADD COLUMN event_id TEXT;
ALTER TABLE analytics_events ADD COLUMN event_version INTEGER NOT NULL DEFAULT 1;

-- SQLite treats every NULL as distinct under UNIQUE, so legacy events sent
-- without an event_id (pre-v1 clients) are entirely unaffected by this
-- constraint; only a genuine repeated event_id collides.
CREATE UNIQUE INDEX idx_analytics_events_event_id ON analytics_events(event_id);

-- One-time cleanup of the two pre-v1 platform spellings still in storage
-- (early test/dev traffic only) - see normalizeClientType() in events.ts,
-- which now writes only the canonical value for every new row.
UPDATE analytics_events SET client_type = 'desktop_windows' WHERE client_type = 'desktop';
UPDATE analytics_events SET client_type = 'chrome_extension' WHERE client_type = 'extension';
