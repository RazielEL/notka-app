import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { createAlertNote, listAlertNoteOccurrences } from "@/lib/server/alert-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const url = new URL(request.url);
    const alertNotes = await listAlertNoteOccurrences(user.id, {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      limit: url.searchParams.get("limit"),
    });

    return NextResponse.json({ alertNotes });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const alertNote = await createAlertNote(user.id, {
      text: body.text,
      scheduledAt: body.scheduledAt,
      timezone: body.timezone,
      recurrence: body.recurrence,
      recurrenceEndAt: body.recurrenceEndAt,
    });

    return NextResponse.json({ alertNote }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
