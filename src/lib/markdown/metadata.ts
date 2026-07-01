import "server-only";

import { createHash } from "node:crypto";

export type MarkdownMetadata = {
  titleFromHeading: string | null;
  excerpt: string;
  contentHash: string;
  checklistTotal: number;
  checklistCompleted: number;
};

export function extractMarkdownMetadata(content: string): MarkdownMetadata {
  const normalized = content.replace(/\r\n/g, "\n");
  const titleFromHeading = extractFirstHeading(normalized);
  const checklist = countChecklistItems(normalized);

  return {
    titleFromHeading,
    excerpt: buildExcerpt(normalized),
    contentHash: createHash("sha256").update(normalized).digest("hex"),
    checklistTotal: checklist.total,
    checklistCompleted: checklist.completed,
  };
}

export function titleFromContent(content: string, fallback = "Untitled note") {
  return extractFirstHeading(content) ?? fallback;
}

function extractFirstHeading(content: string) {
  const line = content
    .split("\n")
    .find((entry) => /^#\s+/.test(entry.trim()));

  if (!line) {
    return null;
  }

  return cleanInlineMarkdown(line.replace(/^#\s+/, "")).slice(0, 120) || null;
}

function buildExcerpt(content: string) {
  const withoutCode = content.replace(/```[\s\S]*?```/g, " ");
  const lines = withoutCode
    .split("\n")
    .filter((line) => !/^#\s+/.test(line.trim()))
    .map((line) => line.replace(/^\s*[-*]\s+\[[ xX]\]\s+/, ""))
    .join(" ");

  return cleanInlineMarkdown(lines).slice(0, 180);
}

function countChecklistItems(content: string) {
  const matches = Array.from(content.matchAll(/^\s*[-*]\s+\[([ xX])\]\s+/gm));

  return {
    total: matches.length,
    completed: matches.filter((match) => match[1]?.toLowerCase() === "x").length,
  };
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
