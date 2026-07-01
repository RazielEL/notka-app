import "server-only";

import { and, desc, eq, isNotNull, isNull, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { folders, notes } from "@/db/schema";
import { extractMarkdownMetadata, titleFromContent } from "@/lib/markdown/metadata";
import { ensureInboxFolder, getFolderForUser } from "@/lib/server/folders";
import { getTemplateBody } from "@/lib/server/templates";
import {
  groupNoteRelativePath,
  groupTrashRelativePath,
  moveMarkdownFile,
  noteRelativePath,
  readMarkdownFile,
  removeMarkdownFile,
  trashRelativePath,
  writeMarkdownFile,
} from "@/lib/storage/paths";
import type { NoteDetailDto, NoteScope, NoteSummaryDto } from "@/lib/types";
import { assertSafeId, normalizeContent, normalizeName, normalizeScope } from "@/lib/validation/ids";

const noteMutationLocks = new Map<string, Promise<void>>();

export function noteToSummaryDto(note: typeof notes.$inferSelect): NoteSummaryDto {
  return {
    id: note.id,
    scope: normalizeScope(note.scope),
    folderId: note.folderId,
    title: note.title,
    pinned: note.pinned === 1,
    alertAt: note.alertAt,
    calendarAt: note.calendarAt,
    excerpt: note.excerpt,
    checklistTotal: note.checklistTotal,
    checklistCompleted: note.checklistCompleted,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export async function listNotes(ownerUserId: string, searchInput?: unknown, scopeInput?: unknown) {
  const scope = normalizeScope(scopeInput);
  const search = typeof searchInput === "string" ? searchInput.trim().slice(0, 120) : "";
  const filters = [
    ...noteScopeConditions(ownerUserId, scope),
    isNull(notes.deletedAt),
    eq(notes.archived, 0),
  ];

  const rows = await getDb()
    .select()
    .from(notes)
    .where(
      search
        ? and(
            ...filters,
            or(like(notes.title, `%${search}%`), like(notes.excerpt, `%${search}%`)),
          )
        : and(...filters),
    )
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));

  return rows.map(noteToSummaryDto);
}

export async function listCalendarNotes(ownerUserId: string, includeGroupInput?: unknown) {
  const includeGroup = includeGroupInput === true || includeGroupInput === "true";
  const rows = await getDb()
    .select()
    .from(notes)
    .where(
      and(
        includeGroup
          ? or(
              and(eq(notes.scope, "personal"), eq(notes.ownerUserId, ownerUserId)),
              eq(notes.scope, "group"),
            )
          : and(eq(notes.scope, "personal"), eq(notes.ownerUserId, ownerUserId)),
        isNull(notes.deletedAt),
        eq(notes.archived, 0),
        or(isNotNull(notes.alertAt), isNotNull(notes.calendarAt)),
      ),
    )
    .orderBy(desc(notes.updatedAt));

  return rows.map(noteToSummaryDto);
}

export async function createNote(ownerUserId: string, input: {
  folderId?: unknown;
  templateId?: unknown;
  title?: unknown;
  content?: unknown;
  scope?: unknown;
}) {
  const scope = normalizeScope(input.scope);
  const folder =
    typeof input.folderId === "string" && input.folderId.length > 0
      ? await getFolderForUser(ownerUserId, input.folderId, scope)
      : await ensureDefaultFolder(ownerUserId, scope);

  let content = normalizeContent(input.content);

  if (!content && typeof input.templateId === "string" && input.templateId.length > 0) {
    content = await getTemplateBody(ownerUserId, input.templateId);
  }

  if (!content) {
    content = "# Untitled note\n\n";
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const filePath = scope === "group" ? groupNoteRelativePath(id) : noteRelativePath(ownerUserId, id);
  const metadata = extractMarkdownMetadata(content);
  const title =
    typeof input.title === "string" && input.title.trim()
      ? normalizeName(input.title, "Untitled note")
      : titleFromContent(content);

  const note = {
    id,
    ownerUserId,
    scope,
    folderId: folder.id,
    createdByUserId: ownerUserId,
    updatedByUserId: ownerUserId,
    title,
    filePath,
    pinned: 0,
    archived: 0,
    deletedAt: null,
    alertAt: null,
    calendarAt: null,
    excerpt: metadata.excerpt,
    contentHash: metadata.contentHash,
    checklistTotal: metadata.checklistTotal,
    checklistCompleted: metadata.checklistCompleted,
    createdAt: now,
    updatedAt: now,
  };

  await writeMarkdownFile(filePath, content);

  try {
    await getDb().insert(notes).values(note);
  } catch (error) {
    await removeMarkdownFile(filePath);
    throw error;
  }

  return noteToDetailDto(note, content);
}

export async function getNoteDetail(
  ownerUserId: string,
  noteIdInput: unknown,
  scopeInput?: unknown,
) {
  const noteId = assertSafeId(noteIdInput, "note id");

  return withNoteMutationLock(noteId, async () => {
    const note = await getNoteForUser(ownerUserId, noteId, scopeInput);
    const content = await readMarkdownFile(note.filePath);
    return noteToDetailDto(note, content);
  });
}

export async function updateNote(ownerUserId: string, noteIdInput: unknown, input: {
  title?: unknown;
  content?: unknown;
  folderId?: unknown;
  pinned?: unknown;
  alertAt?: unknown;
  calendarAt?: unknown;
  scope?: unknown;
}) {
  const noteId = assertSafeId(noteIdInput, "note id");

  return withNoteMutationLock(noteId, async () => updateNoteLocked(ownerUserId, noteId, input));
}

async function updateNoteLocked(ownerUserId: string, noteId: string, input: {
  title?: unknown;
  content?: unknown;
  folderId?: unknown;
  pinned?: unknown;
  alertAt?: unknown;
  calendarAt?: unknown;
  scope?: unknown;
}) {
  const scope = normalizeScope(input.scope);
  const note = await getNoteForUser(ownerUserId, noteId, scope);
  const updates: Partial<typeof notes.$inferInsert> = {
    updatedAt: new Date().toISOString(),
    updatedByUserId: ownerUserId,
  };

  let content: string | null = null;
  let previousContent: string | null = null;
  let wroteContent = false;

  if (input.folderId !== undefined) {
    if (input.folderId === null || input.folderId === "") {
      updates.folderId = null;
    } else {
      const folder = await getFolderForUser(ownerUserId, input.folderId, scope);
      updates.folderId = folder.id;
    }
  }

  if (typeof input.pinned === "boolean") {
    updates.pinned = input.pinned ? 1 : 0;
  }

  if ("alertAt" in input) {
    updates.alertAt = normalizeOptionalDateTime(input.alertAt, "Alert deadline");
  }

  if ("calendarAt" in input) {
    updates.calendarAt = normalizeOptionalDateTime(input.calendarAt, "Calendar date");
  }

  if (typeof input.content === "string") {
    content = normalizeContent(input.content);
    previousContent = await readMarkdownFile(note.filePath);
    const metadata = extractMarkdownMetadata(content);
    updates.excerpt = metadata.excerpt;
    updates.contentHash = metadata.contentHash;
    updates.checklistTotal = metadata.checklistTotal;
    updates.checklistCompleted = metadata.checklistCompleted;

    if (!("title" in input) && shouldInferTitle(note.title)) {
      updates.title = metadata.titleFromHeading ?? note.title;
    }

    await writeMarkdownFile(note.filePath, content);
    wroteContent = true;
  }

  if (typeof input.title === "string") {
    updates.title = normalizeName(input.title, "Untitled note");
  }

  try {
    const result = getDb()
      .update(notes)
      .set(updates)
      .where(and(eq(notes.id, note.id), ...noteScopeConditions(ownerUserId, scope), isNull(notes.deletedAt)))
      .run();

    if (result.changes === 0) {
      throw new Error("Note was changed before it could be saved.");
    }

    const updated = await getNoteForUser(ownerUserId, note.id, scope);
    return noteToDetailDto(updated, content ?? (await readMarkdownFile(updated.filePath)));
  } catch (error) {
    if (wroteContent && previousContent !== null) {
      await writeMarkdownFile(note.filePath, previousContent).catch(() => undefined);
    }

    throw error;
  }
}

export async function deleteNote(ownerUserId: string, noteIdInput: unknown, scopeInput?: unknown) {
  const noteId = assertSafeId(noteIdInput, "note id");

  return withNoteMutationLock(noteId, async () => deleteNoteLocked(ownerUserId, noteId, scopeInput));
}

async function deleteNoteLocked(ownerUserId: string, noteId: string, scopeInput?: unknown) {
  const scope = normalizeScope(scopeInput);
  const note = await getNoteForUser(ownerUserId, noteId, scope);
  const trashPath =
    scope === "group" ? groupTrashRelativePath(note.id) : trashRelativePath(ownerUserId, note.id);
  const now = new Date().toISOString();

  const movedToTrash = await moveMarkdownFile(note.filePath, trashPath);

  try {
    const result = getDb()
      .update(notes)
      .set({
        filePath: trashPath,
        deletedAt: now,
        updatedAt: now,
        updatedByUserId: ownerUserId,
      })
      .where(and(eq(notes.id, note.id), ...noteScopeConditions(ownerUserId, scope), isNull(notes.deletedAt)))
      .run();

    if (result.changes === 0) {
      throw new Error("Note was changed before it could be deleted.");
    }
  } catch (error) {
    if (movedToTrash) {
      await moveMarkdownFile(trashPath, note.filePath).catch(() => undefined);
    }

    throw error;
  }

  return { deletedId: note.id };
}

export async function getNoteContentForTemplate(
  ownerUserId: string,
  noteIdInput: unknown,
  scopeInput?: unknown,
) {
  const noteId = assertSafeId(noteIdInput, "note id");

  return withNoteMutationLock(noteId, async () => {
    const note = await getNoteForUser(ownerUserId, noteId, scopeInput);
    return {
      title: note.title,
      content: await readMarkdownFile(note.filePath),
    };
  });
}

async function getNoteForUser(ownerUserId: string, noteIdInput: unknown, scopeInput?: unknown) {
  const scope = normalizeScope(scopeInput);
  const noteId = assertSafeId(noteIdInput, "note id");
  const rows = await getDb()
    .select()
    .from(notes)
    .leftJoin(folders, eq(notes.folderId, folders.id))
    .where(and(eq(notes.id, noteId), ...noteScopeConditions(ownerUserId, scope), isNull(notes.deletedAt)))
    .limit(1);

  const row = rows[0];

  if (!row?.notes) {
    throw new Error("Note not found.");
  }

  if (row.notes.folderId && !folderBelongsToScope(row.folders, ownerUserId, scope)) {
    throw new Error("Note folder ownership mismatch.");
  }

  return row.notes;
}

function noteToDetailDto(note: typeof notes.$inferSelect, content: string): NoteDetailDto {
  return {
    ...noteToSummaryDto(note),
    content,
    contentHash: note.contentHash,
  };
}

function shouldInferTitle(currentTitle: string) {
  return currentTitle === "Untitled note" || currentTitle === "New note";
}

function normalizeOptionalDateTime(value: unknown, label: string) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be a date.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return parsed.toISOString();
}

function noteScopeConditions(ownerUserId: string, scope: NoteScope) {
  return scope === "group"
    ? [eq(notes.scope, "group")]
    : [eq(notes.scope, "personal"), eq(notes.ownerUserId, ownerUserId)];
}

function folderBelongsToScope(
  folder: typeof folders.$inferSelect | null,
  ownerUserId: string,
  scope: NoteScope,
) {
  if (!folder) {
    return false;
  }

  if (scope === "group") {
    return folder.scope === "group";
  }

  return folder.scope === "personal" && folder.ownerUserId === ownerUserId;
}

async function ensureDefaultFolder(ownerUserId: string, scope: NoteScope) {
  if (scope === "group") {
    const { ensureGroupInboxFolder } = await import("@/lib/server/folders");
    return ensureGroupInboxFolder(ownerUserId);
  }

  return ensureInboxFolder(ownerUserId);
}

async function withNoteMutationLock<T>(noteId: string, operation: () => Promise<T>) {
  const previous = noteMutationLocks.get(noteId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = previous.catch(() => undefined).then(() => current);
  noteMutationLocks.set(noteId, next);

  await previous.catch(() => undefined);

  try {
    return await operation();
  } finally {
    release();

    if (noteMutationLocks.get(noteId) === next) {
      noteMutationLocks.delete(noteId);
    }
  }
}
