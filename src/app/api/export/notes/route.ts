import { NextResponse } from "next/server";

import { apiError, requireApiUser } from "@/lib/server/api";
import { listNotesForExport, type ExportableNote } from "@/lib/server/notes";
import { createZipArchive, type ZipFile } from "@/lib/server/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const exportedNotes = await listNotesForExport(user.id);
    const zip = createZipArchive(toZipFiles(exportedNotes));
    const filename = `notka-notes-${new Date().toISOString().slice(0, 10)}.zip`;

    return new Response(zip, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": contentDisposition(filename),
        "Content-Length": String(zip.byteLength),
        "Content-Type": "application/zip",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

function toZipFiles(notes: ExportableNote[]): ZipFile[] {
  const usedPaths = new Set<string>();

  return notes.map((note) => {
    const scopeDirectory = note.scope === "group" ? "group" : "personal";
    const folderSegments = note.folderPath.map((segment) => sanitizeZipSegment(segment, "Folder"));
    const fileName = `${sanitizeZipSegment(note.title, "Untitled note")}.md`;
    const zipPath = uniqueZipPath([scopeDirectory, ...folderSegments, fileName].join("/"), usedPaths);

    return {
      path: zipPath,
      content: note.content,
      modifiedAt: new Date(note.updatedAt),
    };
  });
}

function sanitizeZipSegment(value: string, fallback: string) {
  const sanitized = value
    .replace(/[\x00-\x1f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .slice(0, 120)
    .trim();

  return sanitized || fallback;
}

function uniqueZipPath(zipPath: string, usedPaths: Set<string>) {
  const extension = ".md";
  const basePath = zipPath.endsWith(extension) ? zipPath.slice(0, -extension.length) : zipPath;
  let candidate = `${basePath}${extension}`;
  let suffix = 2;

  while (usedPaths.has(candidate.toLowerCase())) {
    candidate = `${basePath}-${suffix}${extension}`;
    suffix += 1;
  }

  usedPaths.add(candidate.toLowerCase());
  return candidate;
}

function contentDisposition(filename: string) {
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
