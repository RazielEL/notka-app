ALTER TABLE notes ADD COLUMN alert_at TEXT;
CREATE INDEX IF NOT EXISTS notes_alert_at_idx ON notes(alert_at);
