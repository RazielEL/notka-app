import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import { apiError, readJson } from "@/lib/server/api";
import { authenticateUser } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const user = await authenticateUser(body.email, body.password);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
