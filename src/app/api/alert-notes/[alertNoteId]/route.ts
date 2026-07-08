import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { deleteAlertNoteOccurrence, updateAlertNoteOccurrence } from "@/lib/server/alert-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    alertNoteId: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const result = await updateAlertNoteOccurrence(user.id, params.alertNoteId, {
      text: body.text,
      scheduledAt: body.scheduledAt,
      timezone: body.timezone,
      recurrence: body.recurrence,
      recurrenceEndAt: body.recurrenceEndAt,
      occurrenceAt: body.occurrenceAt,
      mode: body.mode,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request).catch(() => ({}));
    const result = await deleteAlertNoteOccurrence(user.id, params.alertNoteId, {
      occurrenceAt: body.occurrenceAt,
      mode: body.mode,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
