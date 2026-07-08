import { index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull().default("personal"),
    parentFolderId: text("parent_folder_id").references((): AnySQLiteColumn => folders.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerUserIdIdx: index("folders_owner_user_id_idx").on(table.ownerUserId),
    scopeIdx: index("folders_scope_idx").on(table.scope),
    parentFolderIdIdx: index("folders_parent_folder_id_idx").on(table.parentFolderId),
  }),
);

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull().default("personal"),
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    filePath: text("file_path").notNull(),
    pinned: integer("pinned").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: integer("archived").notNull().default(0),
    deletedAt: text("deleted_at"),
    alertAt: text("alert_at"),
    calendarAt: text("calendar_at"),
    excerpt: text("excerpt"),
    contentHash: text("content_hash").notNull(),
    checklistTotal: integer("checklist_total").notNull().default(0),
    checklistCompleted: integer("checklist_completed").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerUserIdIdx: index("notes_owner_user_id_idx").on(table.ownerUserId),
    scopeIdx: index("notes_scope_idx").on(table.scope),
    folderIdIdx: index("notes_folder_id_idx").on(table.folderId),
    folderSortOrderIdx: index("notes_folder_sort_order_idx").on(
      table.scope,
      table.ownerUserId,
      table.folderId,
      table.deletedAt,
      table.sortOrder,
    ),
    alertAtIdx: index("notes_alert_at_idx").on(table.alertAt),
    calendarAtIdx: index("notes_calendar_at_idx").on(table.calendarAt),
    deletedAtIdx: index("notes_deleted_at_idx").on(table.deletedAt),
  }),
);

export const templates = sqliteTable(
  "templates",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    filePath: text("file_path").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerUserIdIdx: index("templates_owner_user_id_idx").on(table.ownerUserId),
  }),
);

export const alertNotes = sqliteTable(
  "alert_notes",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    startsAt: text("starts_at").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    recurrence: text("recurrence").notNull().default("none"),
    recurrenceEndAt: text("recurrence_end_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerUserIdIdx: index("alert_notes_owner_user_id_idx").on(table.ownerUserId),
    startsAtIdx: index("alert_notes_starts_at_idx").on(table.startsAt),
    recurrenceIdx: index("alert_notes_recurrence_idx").on(table.recurrence),
  }),
);

export const alertNoteOccurrenceOverrides = sqliteTable(
  "alert_note_occurrence_overrides",
  {
    id: text("id").primaryKey(),
    alertNoteId: text("alert_note_id")
      .notNull()
      .references(() => alertNotes.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurrenceAt: text("occurrence_at").notNull(),
    scheduledAt: text("scheduled_at"),
    text: text("text"),
    cancelled: integer("cancelled").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerUserIdIdx: index("alert_note_overrides_owner_user_id_idx").on(table.ownerUserId),
    alertNoteIdIdx: index("alert_note_overrides_alert_note_id_idx").on(table.alertNoteId),
    scheduledAtIdx: index("alert_note_overrides_scheduled_at_idx").on(table.scheduledAt),
    occurrenceUniqueIdx: uniqueIndex("alert_note_overrides_occurrence_unique_idx").on(
      table.alertNoteId,
      table.occurrenceAt,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type AlertNote = typeof alertNotes.$inferSelect;
export type NewAlertNote = typeof alertNotes.$inferInsert;
export type AlertNoteOccurrenceOverride = typeof alertNoteOccurrenceOverrides.$inferSelect;
export type NewAlertNoteOccurrenceOverride = typeof alertNoteOccurrenceOverrides.$inferInsert;
