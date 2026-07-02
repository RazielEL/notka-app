import { NextResponse } from "next/server";

import { readJson, apiError } from "@/lib/server/api";
import { runFirstSetup } from "@/lib/server/setup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const user = await runFirstSetup({
      email: body.email,
      displayName: body.displayName,
      password: body.password,
      language: body.language,
    });

    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
