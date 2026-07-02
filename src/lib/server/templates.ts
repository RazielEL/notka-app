import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { templates } from "@/db/schema";
import {
  getBuiltInTemplateBody,
  translateBuiltInTemplateName,
  type Language,
} from "@/lib/i18n";
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
  { id: "blank", name: translateBuiltInTemplateName("en", "blank"), builtIn: true },
  { id: "checklist", name: translateBuiltInTemplateName("en", "checklist"), builtIn: true },
  { id: "table", name: translateBuiltInTemplateName("en", "table"), builtIn: true },
  { id: "daily", name: translateBuiltInTemplateName("en", "daily"), builtIn: true },
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

export async function getTemplateBody(
  ownerUserId: string,
  templateIdInput: unknown,
  language: Language = "en",
) {
  const templateId = assertSafeId(templateIdInput, "template id");

  if (isBuiltInTemplateId(templateId)) {
    return getBuiltInTemplateBody(templateId, language);
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
