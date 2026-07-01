import { NextResponse } from "next/server";

import { apiError, requireApiUser } from "@/lib/server/api";
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
    const notes = await listCalendarNotes(user.id, url.searchParams.get("includeGroup"));
    return NextResponse.json({ notes });
  } catch (error) {
    return apiError(error);
  }
}
