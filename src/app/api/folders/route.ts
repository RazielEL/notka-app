import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { createFolder, listFolders } from "@/lib/server/folders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();

  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  return NextResponse.json({
    folders: await listFolders(user.id, url.searchParams.get("scope") ?? "personal"),
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    const folder = await createFolder(user.id, body.name, body.parentFolderId, body.scope);

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
