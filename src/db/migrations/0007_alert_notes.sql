CREATE TABLE IF NOT EXISTS alert_notes (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recurrence TEXT NOT NULL DEFAULT 'none',
  recurrence_end_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_note_occurrence_overrides (
  id TEXT PRIMARY KEY NOT NULL,
  alert_note_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  occurrence_at TEXT NOT NULL,
  scheduled_at TEXT,
  text TEXT,
  cancelled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (alert_note_id) REFERENCES alert_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS alert_notes_owner_user_id_idx ON alert_notes(owner_user_id);
CREATE INDEX IF NOT EXISTS alert_notes_starts_at_idx ON alert_notes(starts_at);
CREATE INDEX IF NOT EXISTS alert_notes_recurrence_idx ON alert_notes(recurrence);
CREATE INDEX IF NOT EXISTS alert_note_overrides_owner_user_id_idx ON alert_note_occurrence_overrides(owner_user_id);
CREATE INDEX IF NOT EXISTS alert_note_overrides_alert_note_id_idx ON alert_note_occurrence_overrides(alert_note_id);
CREATE INDEX IF NOT EXISTS alert_note_overrides_scheduled_at_idx ON alert_note_occurrence_overrides(scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS alert_note_overrides_occurrence_unique_idx
  ON alert_note_occurrence_overrides(alert_note_id, occurrence_at);
