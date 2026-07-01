import "server-only";

import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { folders, notes } from "@/db/schema";
import type { FolderDto, NoteScope } from "@/lib/types";
import { assertSafeId, normalizeName, normalizeScope } from "@/lib/validation/ids";

const INBOX_NAME = "Inbox";
const GROUP_INBOX_NAME = "Group Inbox";

export function folderToDto(folder: typeof folders.$inferSelect): FolderDto {
  return {
    id: folder.id,
    scope: normalizeScope(folder.scope),
    parentFolderId: folder.parentFolderId,
    name: folder.name,
    sortOrder: folder.sortOrder,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export async function listFolders(ownerUserId: string, scopeInput?: unknown) {
  const scope = normalizeScope(scopeInput);

  if (scope === "group") {
    await ensureGroupInboxFolder(ownerUserId);
  }

  const rows = await getDb()
    .select()
    .from(folders)
    .where(folderScopeFilter(ownerUserId, scope))
    .orderBy(asc(folders.sortOrder), asc(folders.name));

  return rows.map(folderToDto);
}

export async function ensureInboxFolder(ownerUserId: string) {
  return ensureDefaultFolder(ownerUserId, "personal");
}

export async function ensureGroupInboxFolder(ownerUserId: string) {
  return ensureDefaultFolder(ownerUserId, "group");
}

async function ensureDefaultFolder(ownerUserId: string, scope: NoteScope) {
  const name = defaultFolderName(scope);
  return getDb().transaction((tx) => {
    const existing = tx
      .select()
      .from(folders)
      .where(
        and(
          ...folderScopeConditions(ownerUserId, scope),
          eq(folders.name, name),
          isNull(folders.parentFolderId),
        ),
      )
      .limit(1)
      .get();

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const folder = {
      id: randomUUID(),
      ownerUserId,
      scope,
      parentFolderId: null,
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      name,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    tx.insert(folders).values(folder).run();
    return folder;
  });
}

export async function createFolder(
  ownerUserId: string,
  nameInput: unknown,
  parentFolderIdInput?: unknown,
  scopeInput?: unknown,
) {
  const scope = normalizeScope(scopeInput);
  const name = normalizeName(nameInput, "New folder");
  const parentFolderId = await resolveParentFolderId(ownerUserId, scope, parentFolderIdInput);
  const [orderRow] = await getDb()
    .select({ value: max(folders.sortOrder) })
    .from(folders)
    .where(folderParentFilter(ownerUserId, scope, parentFolderId));

  const now = new Date().toISOString();
  const folder = {
    id: randomUUID(),
    ownerUserId,
    scope,
    parentFolderId,
    createdByUserId: ownerUserId,
    updatedByUserId: ownerUserId,
    name,
    sortOrder: (orderRow?.value ?? 0) + 10,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(folders).values(folder);
  return folderToDto(folder);
}

export async function updateFolder(
  ownerUserId: string,
  folderIdInput: unknown,
  input: {
    name?: unknown;
    parentFolderId?: unknown;
    scope?: unknown;
  },
) {
  const scope = normalizeScope(input.scope);
  const folderId = assertSafeId(folderIdInput, "folder id");
  const folder = await getFolderForUser(ownerUserId, folderId, scope);
  const updates: Partial<typeof folders.$inferInsert> = {
    updatedAt: new Date().toISOString(),
    updatedByUserId: ownerUserId,
  };

  if (typeof input.name === "string") {
    updates.name = normalizeName(input.name, "Folder");
  }

  if (input.parentFolderId !== undefined) {
    if (isDefaultFolder(folder)) {
      updates.parentFolderId = null;
    } else {
      const parentFolderId = await resolveParentFolderId(ownerUserId, scope, input.parentFolderId);

      if (parentFolderId === folder.id) {
        throw new Error("Folder cannot be moved into itself.");
      }

      if (parentFolderId) {
        const allFolders = await listRawFolders(ownerUserId, scope);
        const descendants = getDescendantFolderIds(allFolders, folder.id);

        if (descendants.includes(parentFolderId)) {
          throw new Error("Folder cannot be moved into its own child.");
        }
      }

      updates.parentFolderId = parentFolderId;

      const [orderRow] = await getDb()
        .select({ value: max(folders.sortOrder) })
        .from(folders)
        .where(folderParentFilter(ownerUserId, scope, parentFolderId));

      updates.sortOrder = (orderRow?.value ?? 0) + 10;
    }
  }

  await getDb()
    .update(folders)
    .set(updates)
    .where(and(eq(folders.id, folder.id), ...folderScopeConditions(ownerUserId, scope)));

  return folderToDto(await getFolderForUser(ownerUserId, folder.id, scope));
}

export async function deleteFolder(
  ownerUserId: string,
  folderIdInput: unknown,
  moveToInbox: boolean,
  scopeInput?: unknown,
) {
  const scope = normalizeScope(scopeInput);
  const folderId = assertSafeId(folderIdInput, "folder id");
  const folder = await getFolderForUser(ownerUserId, folderId, scope);

  if (isDefaultFolder(folder)) {
    throw new Error("Default folder cannot be deleted.");
  }

  const allFolders = await listRawFolders(ownerUserId, scope);
  const folderIds = [folder.id, ...getDescendantFolderIds(allFolders, folder.id)];
  const inbox = moveToInbox ? await ensureDefaultFolder(ownerUserId, scope) : null;

  getDb().transaction((tx) => {
    const activeNotes = tx
      .select({ id: notes.id })
      .from(notes)
      .where(
        and(
          ...noteScopeConditions(ownerUserId, scope),
          inArray(notes.folderId, folderIds),
          isNull(notes.deletedAt),
        ),
      )
      .all();

    if (activeNotes.length > 0 && !inbox) {
      throw new Error("Folder is not empty.");
    }

    if (activeNotes.length > 0) {
      tx.update(notes)
        .set({
          folderId: inbox?.id ?? null,
          updatedAt: new Date().toISOString(),
          updatedByUserId: ownerUserId,
        })
        .where(
          and(
            ...noteScopeConditions(ownerUserId, scope),
            inArray(notes.folderId, folderIds),
            isNull(notes.deletedAt),
          ),
        )
        .run();
    }

    tx.delete(folders)
      .where(and(inArray(folders.id, folderIds), ...folderScopeConditions(ownerUserId, scope)))
      .run();
  });

  return { deletedId: folderId };
}

export async function getFolderForUser(
  ownerUserId: string,
  folderIdInput: unknown,
  scopeInput?: unknown,
) {
  const scope = normalizeScope(scopeInput);
  const folderId = assertSafeId(folderIdInput, "folder id");
  const rows = await getDb()
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), ...folderScopeConditions(ownerUserId, scope)))
    .limit(1);

  const folder = rows[0];

  if (!folder) {
    throw new Error("Folder not found.");
  }

  return folder;
}

async function resolveParentFolderId(
  ownerUserId: string,
  scope: NoteScope,
  parentFolderIdInput: unknown,
) {
  if (parentFolderIdInput === undefined || parentFolderIdInput === null || parentFolderIdInput === "") {
    return null;
  }

  const parent = await getFolderForUser(ownerUserId, parentFolderIdInput, scope);
  return parent.id;
}

function folderParentFilter(ownerUserId: string, scope: NoteScope, parentFolderId: string | null) {
  return parentFolderId
    ? and(...folderScopeConditions(ownerUserId, scope), eq(folders.parentFolderId, parentFolderId))
    : and(...folderScopeConditions(ownerUserId, scope), isNull(folders.parentFolderId));
}

async function listRawFolders(ownerUserId: string, scope: NoteScope) {
  return getDb().select().from(folders).where(folderScopeFilter(ownerUserId, scope));
}

function getDescendantFolderIds(allFolders: Array<typeof folders.$inferSelect>, folderId: string) {
  const descendants: string[] = [];
  const stack = [folderId];

  while (stack.length > 0) {
    const currentId = stack.pop();

    if (!currentId) {
      continue;
    }

    const children = allFolders.filter((folder) => folder.parentFolderId === currentId);

    for (const child of children) {
      descendants.push(child.id);
      stack.push(child.id);
    }
  }

  return descendants;
}

function defaultFolderName(scope: NoteScope) {
  return scope === "group" ? GROUP_INBOX_NAME : INBOX_NAME;
}

function isDefaultFolder(folder: typeof folders.$inferSelect) {
  return folder.parentFolderId === null && folder.name === defaultFolderName(normalizeScope(folder.scope));
}

function folderScopeFilter(ownerUserId: string, scope: NoteScope) {
  return and(...folderScopeConditions(ownerUserId, scope));
}

function folderScopeConditions(ownerUserId: string, scope: NoteScope) {
  return scope === "group"
    ? [eq(folders.scope, "group")]
    : [eq(folders.scope, "personal"), eq(folders.ownerUserId, ownerUserId)];
}

function noteScopeConditions(ownerUserId: string, scope: NoteScope) {
  return scope === "group"
    ? [eq(notes.scope, "group")]
    : [eq(notes.scope, "personal"), eq(notes.ownerUserId, ownerUserId)];
}
