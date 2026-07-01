import "server-only";

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { DATA_DIR } from "@/db";
import { assertSafeId } from "@/lib/validation/ids";

export function noteRelativePath(userId: string, noteId: string) {
  return path.posix.join(
    "notes",
    assertSafeId(userId, "user id"),
    `${assertSafeId(noteId, "note id")}.md`,
  );
}

export function groupNoteRelativePath(noteId: string) {
  return path.posix.join("notes", "group", `${assertSafeId(noteId, "note id")}.md`);
}

export function trashRelativePath(userId: string, noteId: string) {
  return path.posix.join(
    "trash",
    assertSafeId(userId, "user id"),
    `${assertSafeId(noteId, "note id")}.md`,
  );
}

export function groupTrashRelativePath(noteId: string) {
  return path.posix.join("trash", "group", `${assertSafeId(noteId, "note id")}.md`);
}

export function templateRelativePath(userId: string, templateId: string) {
  return path.posix.join(
    "templates",
    assertSafeId(userId, "user id"),
    `${assertSafeId(templateId, "template id")}.md`,
  );
}

export function resolveDataPath(relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    throw new Error("Absolute data paths are not allowed");
  }

  const dataRoot = path.resolve(DATA_DIR);
  const fullPath = path.resolve(dataRoot, relativePath);

  if (fullPath !== dataRoot && !fullPath.startsWith(`${dataRoot}${path.sep}`)) {
    throw new Error("Resolved path escaped the data directory");
  }

  return fullPath;
}

export async function readMarkdownFile(relativePath: string) {
  const fullPath = resolveDataPath(relativePath);

  try {
    return await readFile(fullPath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

export async function writeMarkdownFile(relativePath: string, content: string) {
  const fullPath = resolveDataPath(relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  const tempPath = path.join(path.dirname(fullPath), `.${path.basename(fullPath)}.${randomUUID()}.tmp`);

  try {
    await writeFile(tempPath, content.replace(/\r\n/g, "\n"), "utf8");
    await rename(tempPath, fullPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function moveMarkdownFile(fromRelativePath: string, toRelativePath: string) {
  const fromPath = resolveDataPath(fromRelativePath);
  const toPath = resolveDataPath(toRelativePath);

  await mkdir(path.dirname(toPath), { recursive: true });

  try {
    await rename(fromPath, toPath);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export async function removeMarkdownFile(relativePath: string) {
  const fullPath = resolveDataPath(relativePath);
  await rm(fullPath, { force: true });
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
