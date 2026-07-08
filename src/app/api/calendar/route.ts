import { NextResponse } from "next/server";

import { apiError, requireApiUser } from "@/lib/server/api";
import { listAlertNoteOccurrences } from "@/lib/server/alert-notes";
import { listCalendarNotes } from "@/lib/server/notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const url = new URL(request.url);
    const [notes, alertNotes] = await Promise.all([
      listCalendarNotes(user.id, url.searchParams.get("includeGroup")),
      listAlertNoteOccurrences(user.id, {
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
        limit: 500,
      }),
    ]);

    return NextResponse.json({ notes, alertNotes });
  } catch (error) {
    return apiError(error);
  }
}
