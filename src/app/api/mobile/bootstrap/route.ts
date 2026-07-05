import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { hasUsers } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "Notka",
    version: "0.1.0",
    hasUsers: await hasUsers(),
    user: await getCurrentUser(),
    serverTime: new Date().toISOString(),
  });
}
