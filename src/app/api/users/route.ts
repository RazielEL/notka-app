import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/server/api";
import { listUsers } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();

  if (user instanceof NextResponse) {
    return user;
  }

  return NextResponse.json({ users: await listUsers() });
}
