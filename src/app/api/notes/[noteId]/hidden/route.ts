import { NextResponse } from "next/server";

import { hasHiddenAccess } from "@/lib/auth/hidden-access";
import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { hideNote, unhideNote } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    noteId: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    if (!hasHiddenAccess(user.id)) {
      return NextResponse.json({ error: "Hidden notes are locked." }, { status: 403 });
    }

    const body = await readJson(request);
    const scope = body.scope ?? new URL(request.url).searchParams.get("scope");
    const note = body.hidden === false
      ? await unhideNote(user.id, params.noteId, scope)
      : await hideNote(user.id, params.noteId, scope);

    return NextResponse.json({ note });
  } catch (error) {
    return apiError(error);
  }
}
