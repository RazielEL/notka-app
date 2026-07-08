import { NextResponse } from "next/server";

import { hasHiddenAccess } from "@/lib/auth/hidden-access";
import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { createNote, listHiddenNotes, listNotes, listTrashNotes } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();

  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "personal";
  const search = url.searchParams.get("search") ?? "";
  const hidden = url.searchParams.get("hidden") === "true";

  if (hidden) {
    if (!hasHiddenAccess(user.id)) {
      return NextResponse.json({ error: "Hidden notes are locked." }, { status: 403 });
    }

    const notes = await listHiddenNotes(user.id, search);
    return NextResponse.json({ notes });
  }

  const notes =
    url.searchParams.get("trash") === "true"
      ? await listTrashNotes(user.id, search, scope)
      : await listNotes(user.id, search, scope);

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const hidden = body.hidden === true;

    if (hidden && !hasHiddenAccess(user.id)) {
      return NextResponse.json({ error: "Hidden notes are locked." }, { status: 403 });
    }

    const note = await createNote(user.id, {
      folderId: body.folderId,
      templateId: body.templateId,
      title: body.title,
      content: body.content,
      scope: body.scope,
      language: body.language,
      hidden,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
