import "server-only";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

import * as schema from "@/db/schema";

export const DATA_DIR = process.env.DATA_DIR ?? "/data";
export const SQLITE_PATH = process.env.SQLITE_DB_PATH ?? path.join(DATA_DIR, "app.db");

let sqlite: Database.Database | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

const INITIAL_MIGRATION = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  hidden_pin_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'personal',
  parent_folder_id TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'personal',
  folder_id TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  alert_at TEXT,
  calendar_at TEXT,
  excerpt TEXT,
  content_hash TEXT NOT NULL,
  checklist_total INTEGER NOT NULL DEFAULT 0,
  checklist_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS folders_owner_user_id_idx ON folders(owner_user_id);
CREATE INDEX IF NOT EXISTS folders_scope_idx ON folders(scope);
CREATE INDEX IF NOT EXISTS folders_parent_folder_id_idx ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS notes_owner_user_id_idx ON notes(owner_user_id);
CREATE INDEX IF NOT EXISTS notes_scope_idx ON notes(scope);
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folder_id);
CREATE INDEX IF NOT EXISTS notes_folder_sort_order_idx ON notes(scope, owner_user_id, folder_id, deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS notes_alert_at_idx ON notes(alert_at);
CREATE INDEX IF NOT EXISTS notes_calendar_at_idx ON notes(calendar_at);
CREATE INDEX IF NOT EXISTS notes_deleted_at_idx ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS templates_owner_user_id_idx ON templates(owner_user_id);
`;

function runMigrations(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const migrationId = "0000_initial";
  const applied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(migrationId);

  if (!applied) {
    database.exec(INITIAL_MIGRATION);
    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(migrationId, new Date().toISOString());
  }

  const nestedFoldersMigrationId = "0001_nested_folders";
  const nestedFoldersApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(nestedFoldersMigrationId);

  if (!nestedFoldersApplied) {
    const columns = database.prepare("PRAGMA table_info(folders)").all() as Array<{ name: string }>;
    const hasParentFolderId = columns.some((column) => column.name === "parent_folder_id");

    if (!hasParentFolderId) {
      database.exec("ALTER TABLE folders ADD COLUMN parent_folder_id TEXT;");
    }

    database.exec(
      "CREATE INDEX IF NOT EXISTS folders_parent_folder_id_idx ON folders(parent_folder_id);",
    );
    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(nestedFoldersMigrationId, new Date().toISOString());
  }

  const noteAlertsMigrationId = "0002_note_alerts";
  const noteAlertsApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(noteAlertsMigrationId);

  if (!noteAlertsApplied) {
    const columns = database.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
    const hasAlertAt = columns.some((column) => column.name === "alert_at");

    if (!hasAlertAt) {
      database.exec("ALTER TABLE notes ADD COLUMN alert_at TEXT;");
    }

    database.exec("CREATE INDEX IF NOT EXISTS notes_alert_at_idx ON notes(alert_at);");
    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(noteAlertsMigrationId, new Date().toISOString());
  }

  const scopesMigrationId = "0003_group_notes_scope";
  const scopesApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(scopesMigrationId);

  if (!scopesApplied) {
    const folderColumns = database.prepare("PRAGMA table_info(folders)").all() as Array<{ name: string }>;
    const noteColumns = database.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;

    if (!folderColumns.some((column) => column.name === "scope")) {
      database.exec("ALTER TABLE folders ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal';");
    }

    if (!folderColumns.some((column) => column.name === "created_by_user_id")) {
      database.exec("ALTER TABLE folders ADD COLUMN created_by_user_id TEXT;");
    }

    if (!folderColumns.some((column) => column.name === "updated_by_user_id")) {
      database.exec("ALTER TABLE folders ADD COLUMN updated_by_user_id TEXT;");
    }

    if (!noteColumns.some((column) => column.name === "scope")) {
      database.exec("ALTER TABLE notes ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal';");
    }

    if (!noteColumns.some((column) => column.name === "created_by_user_id")) {
      database.exec("ALTER TABLE notes ADD COLUMN created_by_user_id TEXT;");
    }

    if (!noteColumns.some((column) => column.name === "updated_by_user_id")) {
      database.exec("ALTER TABLE notes ADD COLUMN updated_by_user_id TEXT;");
    }

    database.exec(`
      UPDATE folders SET scope = 'personal' WHERE scope IS NULL OR scope = '';
      UPDATE notes SET scope = 'personal' WHERE scope IS NULL OR scope = '';
      UPDATE folders SET created_by_user_id = owner_user_id WHERE created_by_user_id IS NULL;
      UPDATE folders SET updated_by_user_id = owner_user_id WHERE updated_by_user_id IS NULL;
      UPDATE notes SET created_by_user_id = owner_user_id WHERE created_by_user_id IS NULL;
      UPDATE notes SET updated_by_user_id = owner_user_id WHERE updated_by_user_id IS NULL;
      CREATE INDEX IF NOT EXISTS folders_scope_idx ON folders(scope);
      CREATE INDEX IF NOT EXISTS notes_scope_idx ON notes(scope);
    `);

    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(scopesMigrationId, new Date().toISOString());
  }

  const noteCalendarMigrationId = "0004_note_calendar";
  const noteCalendarApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(noteCalendarMigrationId);

  if (!noteCalendarApplied) {
    const columns = database.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
    const hasCalendarAt = columns.some((column) => column.name === "calendar_at");

    if (!hasCalendarAt) {
      database.exec("ALTER TABLE notes ADD COLUMN calendar_at TEXT;");
    }

    database.exec("CREATE INDEX IF NOT EXISTS notes_calendar_at_idx ON notes(calendar_at);");
    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(noteCalendarMigrationId, new Date().toISOString());
  }

  const personalRootMigrationId = "0005_personal_all_notes_root";
  const personalRootApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(personalRootMigrationId);

  if (!personalRootApplied) {
    database.exec(`
      UPDATE notes
      SET folder_id = NULL
      WHERE folder_id IN (
        SELECT id FROM folders
        WHERE scope = 'personal'
          AND name = 'Inbox'
          AND parent_folder_id IS NULL
      );

      UPDATE folders
      SET parent_folder_id = NULL
      WHERE parent_folder_id IN (
        SELECT id FROM folders
        WHERE scope = 'personal'
          AND name = 'Inbox'
          AND parent_folder_id IS NULL
      );

      DELETE FROM folders
      WHERE scope = 'personal'
        AND name = 'Inbox'
        AND parent_folder_id IS NULL;
    `);

    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(personalRootMigrationId, new Date().toISOString());
  }

  const noteSortOrderMigrationId = "0006_note_sort_order";
  const noteSortOrderApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(noteSortOrderMigrationId);

  if (!noteSortOrderApplied) {
    const columns = database.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;
    const hasSortOrder = columns.some((column) => column.name === "sort_order");

    if (!hasSortOrder) {
      database.exec("ALTER TABLE notes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");
    }

    database.exec(`
      CREATE INDEX IF NOT EXISTS notes_folder_sort_order_idx
      ON notes(scope, owner_user_id, folder_id, deleted_at, sort_order);

      UPDATE notes
      SET sort_order = (
        SELECT COUNT(*) * 10
        FROM notes AS ranked
        WHERE ranked.deleted_at IS NULL
          AND ranked.scope = notes.scope
          AND ranked.owner_user_id = notes.owner_user_id
          AND COALESCE(ranked.folder_id, '') = COALESCE(notes.folder_id, '')
          AND (
            ranked.pinned > notes.pinned
            OR (ranked.pinned = notes.pinned AND ranked.updated_at > notes.updated_at)
            OR (ranked.pinned = notes.pinned AND ranked.updated_at = notes.updated_at AND ranked.title < notes.title)
            OR (ranked.pinned = notes.pinned AND ranked.updated_at = notes.updated_at AND ranked.title = notes.title AND ranked.id <= notes.id)
          )
      )
      WHERE deleted_at IS NULL
        AND sort_order = 0;
    `);

    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(noteSortOrderMigrationId, new Date().toISOString());
  }

  const alertNotesMigrationId = "0007_alert_notes";
  const alertNotesApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(alertNotesMigrationId);

  if (!alertNotesApplied) {
    database.exec(`
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
      CREATE INDEX IF NOT EXISTS alert_note_overrides_owner_user_id_idx
        ON alert_note_occurrence_overrides(owner_user_id);
      CREATE INDEX IF NOT EXISTS alert_note_overrides_alert_note_id_idx
        ON alert_note_occurrence_overrides(alert_note_id);
      CREATE INDEX IF NOT EXISTS alert_note_overrides_scheduled_at_idx
        ON alert_note_occurrence_overrides(scheduled_at);
      CREATE UNIQUE INDEX IF NOT EXISTS alert_note_overrides_occurrence_unique_idx
        ON alert_note_occurrence_overrides(alert_note_id, occurrence_at);
    `);

    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(alertNotesMigrationId, new Date().toISOString());
  }

  const hiddenNotesMigrationId = "0008_hidden_notes";
  const hiddenNotesApplied = database
    .prepare("SELECT id FROM __drizzle_migrations WHERE id = ?")
    .get(hiddenNotesMigrationId);

  if (!hiddenNotesApplied) {
    const userColumns = database.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const noteColumns = database.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string }>;

    if (!userColumns.some((column) => column.name === "hidden_pin_hash")) {
      database.exec("ALTER TABLE users ADD COLUMN hidden_pin_hash TEXT;");
    }

    if (!noteColumns.some((column) => column.name === "archived")) {
      database.exec("ALTER TABLE notes ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;");
    }

    database
      .prepare("INSERT INTO __drizzle_migrations (id, applied_at) VALUES (?, ?)")
      .run(hiddenNotesMigrationId, new Date().toISOString());
  }
}

export function getSqlite() {
  if (!sqlite) {
    mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
    mkdirSync(path.join(DATA_DIR, "notes"), { recursive: true });
    mkdirSync(path.join(DATA_DIR, "trash"), { recursive: true });
    mkdirSync(path.join(DATA_DIR, "templates"), { recursive: true });

    sqlite = new Database(SQLITE_PATH);
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    runMigrations(sqlite);
  }

  return sqlite;
}

export function getDb() {
  if (!db) {
    db = drizzle(getSqlite(), { schema });
  }

  return db;
}
