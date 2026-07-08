import { NextResponse } from "next/server";

import { clearHiddenAccess, hasHiddenAccess } from "@/lib/auth/hidden-access";
import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { getHiddenNotesSettings, setHiddenNotesPin } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const settings = await getHiddenNotesSettings(user.id);
    return NextResponse.json({ ...settings, unlocked: hasHiddenAccess(user.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const settings = await setHiddenNotesPin(user.id, body.pin, body.password);

    return NextResponse.json({ ...settings, unlocked: hasHiddenAccess(user.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    clearHiddenAccess();
    const settings = await getHiddenNotesSettings(user.id);
    return NextResponse.json({ ...settings, unlocked: false });
  } catch (error) {
    return apiError(error);
  }
}
