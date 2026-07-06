import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { deleteFolder, updateFolder } from "@/lib/server/folders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    folderId: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const rawBody = await readJson(request);
    const body =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? rawBody
        : {};
    const url = new URL(request.url);
    const folder = await updateFolder(user.id, params.folderId, {
      name: "name" in body ? body.name : undefined,
      parentFolderId: "parentFolderId" in body ? body.parentFolderId : undefined,
      sortOrder: "sortOrder" in body ? body.sortOrder : undefined,
      scope: "scope" in body ? body.scope : url.searchParams.get("scope"),
    });

    return NextResponse.json({ folder });
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

    const url = new URL(request.url);
    const moveToRoot =
      url.searchParams.get("moveToRoot") !== "false" &&
      url.searchParams.get("moveToInbox") !== "false";
    const result = await deleteFolder(
      user.id,
      params.folderId,
      moveToRoot,
      url.searchParams.get("scope") ?? "personal",
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
