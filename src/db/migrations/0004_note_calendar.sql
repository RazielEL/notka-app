ALTER TABLE notes ADD COLUMN calendar_at TEXT;
CREATE INDEX IF NOT EXISTS notes_calendar_at_idx ON notes(calendar_at);
