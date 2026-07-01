import { NextResponse } from "next/server";

import { apiError, readJson, requireApiUser } from "@/lib/server/api";
import { getNoteContentForTemplate } from "@/lib/server/notes";
import { createTemplateFromContent, listTemplates } from "@/lib/server/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireApiUser();

  if (user instanceof NextResponse) {
    return user;
  }

  return NextResponse.json({ templates: await listTemplates(user.id) });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();

    if (user instanceof NextResponse) {
      return user;
    }

    const body = await readJson(request);
    let content = typeof body.content === "string" ? body.content : "";
    let fallbackName = "Template";

    if (!content && typeof body.sourceNoteId === "string") {
      const source = await getNoteContentForTemplate(user.id, body.sourceNoteId, body.scope);
      content = source.content;
      fallbackName = source.title;
    }

    const template = await createTemplateFromContent(
      user.id,
      body.name ?? fallbackName,
      content,
    );

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
