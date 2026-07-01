import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import { apiError, readJson } from "@/lib/server/api";
import { createUser, hasUsers } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!(await hasUsers())) {
      return NextResponse.json(
        { error: "Create the first admin account in setup first." },
        { status: 403 },
      );
    }

    const body = await readJson(request);
    const user = await createUser({
      email: body.email,
      displayName: body.displayName,
      password: body.password,
    });

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
