import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { deleteNote, getNoteDetail, hardDeleteNote, restoreNote, updateNote } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    noteId: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const url = new URL(_request.url);
    const note = await getNoteDetail(
      user.id,
      params.noteId,
      url.searchParams.get("scope"),
      url.searchParams.get("trash") === "true" ? "trash" : "active",
    );
    return NextResponse.json({ note });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const rawBody = await readJson(request);
    const body =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? rawBody
        : {};
    const url = new URL(request.url);

    if (body.restore === true) {
      const note = await restoreNote(user.id, params.noteId, body.scope ?? url.searchParams.get("scope"));
      return NextResponse.json({ note });
    }

    const update: Parameters<typeof updateNote>[2] = {};

    if ("title" in body) {
      update.title = body.title;
    }

    if ("content" in body) {
      update.content = body.content;
    }

    if ("contentHash" in body) {
      update.expectedContentHash = body.contentHash;
    }

    if ("folderId" in body) {
      update.folderId = body.folderId;
    }

    if ("pinned" in body) {
      update.pinned = body.pinned;
    }

    if ("sortOrder" in body) {
      update.sortOrder = body.sortOrder;
    }

    if ("alertAt" in body) {
      update.alertAt = body.alertAt;
    }

    if ("calendarAt" in body) {
      update.calendarAt = body.calendarAt;
    }

    if ("scope" in body) {
      update.scope = body.scope;
    } else {
      update.scope = url.searchParams.get("scope");
    }

    const note = await updateNote(user.id, params.noteId, update);

    return NextResponse.json({ note });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const url = new URL(_request.url);
    const result =
      url.searchParams.get("hard") === "true"
        ? await hardDeleteNote(user.id, params.noteId, url.searchParams.get("scope"))
        : await deleteNote(user.id, params.noteId, url.searchParams.get("scope"));
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
