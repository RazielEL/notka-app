import { NextResponse } from "next/server";

import { createHiddenAccess } from "@/lib/auth/hidden-access";
import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { getHiddenNotesSettings, verifyHiddenNotesAccess } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const value = typeof body.value === "string" ? body.value : "";
    const unlocked = await verifyHiddenNotesAccess(user.id, {
      pin: body.pin ?? value,
      password: body.password ?? value,
    });

    if (!unlocked) {
      return NextResponse.json({ error: "Invalid PIN or password." }, { status: 401 });
    }

    createHiddenAccess(user.id);
    const settings = await getHiddenNotesSettings(user.id);
    return NextResponse.json({ ...settings, unlocked: true });
  } catch (error) {
    return apiError(error);
  }
}
