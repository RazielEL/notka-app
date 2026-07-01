import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { templates } from "@/db/schema";
import {
  readMarkdownFile,
  removeMarkdownFile,
  templateRelativePath,
  writeMarkdownFile,
} from "@/lib/storage/paths";
import type { TemplateDto } from "@/lib/types";
import { assertSafeId, normalizeContent, normalizeName } from "@/lib/validation/ids";

const BUILT_IN_TEMPLATE_IDS = ["blank", "checklist", "table", "daily"] as const;
type BuiltInTemplateId = (typeof BUILT_IN_TEMPLATE_IDS)[number];

export const BUILT_IN_TEMPLATES: Array<TemplateDto> = [
  { id: "blank", name: "Blank note", builtIn: true },
  { id: "checklist", name: "Checklist", builtIn: true },
  { id: "table", name: "Table", builtIn: true },
  { id: "daily", name: "Daily note", builtIn: true },
];

export async function listTemplates(ownerUserId: string) {
  const rows = await getDb()
    .select()
    .from(templates)
    .where(eq(templates.ownerUserId, ownerUserId))
    .orderBy(asc(templates.name));

  return [
    ...BUILT_IN_TEMPLATES,
    ...rows.map((template) => ({
      id: template.id,
      name: template.name,
      builtIn: false,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    })),
  ];
}

export async function createTemplateFromContent(ownerUserId: string, nameInput: unknown, content: string) {
  const now = new Date().toISOString();
  const id = randomUUID();
  const filePath = templateRelativePath(ownerUserId, id);
  const normalizedContent = normalizeContent(content);
  const template = {
    id,
    ownerUserId,
    name: normalizeName(nameInput, "Template"),
    filePath,
    createdAt: now,
    updatedAt: now,
  };

  await writeMarkdownFile(filePath, normalizedContent);

  try {
    await getDb().insert(templates).values(template);
  } catch (error) {
    await removeMarkdownFile(filePath);
    throw error;
  }

  return {
    id: template.id,
    name: template.name,
    builtIn: false,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  } satisfies TemplateDto;
}

export async function getTemplateBody(ownerUserId: string, templateIdInput: unknown) {
  const templateId = assertSafeId(templateIdInput, "template id");

  if (isBuiltInTemplateId(templateId)) {
    return getBuiltInTemplateBody(templateId);
  }

  const rows = await getDb()
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.ownerUserId, ownerUserId)))
    .limit(1);

  const template = rows[0];

  if (!template) {
    throw new Error("Template not found.");
  }

  return readMarkdownFile(template.filePath);
}

function isBuiltInTemplateId(value: string): value is BuiltInTemplateId {
  return BUILT_IN_TEMPLATE_IDS.includes(value as BuiltInTemplateId);
}

function getBuiltInTemplateBody(templateId: BuiltInTemplateId) {
  if (templateId === "checklist") {
    return "<!-- notka:type=checklist -->\n# Checklist\n\n- [ ] First item\n- [ ] Second item\n- [ ] Third item\n";
  }

  if (templateId === "table") {
    return "<!-- notka:type=table -->\n# Table\n\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n";
  }

  if (templateId === "daily") {
    const today = new Date().toLocaleDateString("en-CA");
    return `# ${today}\n\n## Notes\n\n\n## Checklist\n\n- [ ] \n`;
  }

  return "# Untitled note\n\n";
}
