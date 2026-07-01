import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { createNote, listNotes } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();

  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const notes = await listNotes(
    user.id,
    url.searchParams.get("search") ?? "",
    url.searchParams.get("scope") ?? "personal",
  );

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const note = await createNote(user.id, {
      folderId: body.folderId,
      templateId: body.templateId,
      title: body.title,
      content: body.content,
      scope: body.scope,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
