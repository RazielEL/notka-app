"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  content: string;
  onToggleCheckbox: (lineIndex: number) => void;
};

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string; key: string }
  | { type: "paragraph"; text: string; key: string }
  | { type: "bullet"; text: string; key: string }
  | { type: "checkbox"; text: string; checked: boolean; lineIndex: number; key: string }
  | { type: "code"; text: string; key: string }
  | { type: "rule"; key: string };

export function MarkdownPreview({ content, onToggleCheckbox }: MarkdownPreviewProps) {
  const blocks = parseMarkdown(content);

  if (blocks.length === 0) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-2xl border border-dashed border-black/[0.08] p-6 text-sm text-slate-400 dark:border-white/[0.08] dark:text-slate-500">
        Nothing to preview yet.
      </div>
    );
  }

  return (
    <article className="preview-prose mx-auto max-w-3xl space-y-4">
      {blocks.map((block) => {
        if (block.type === "heading") {
          const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
          return (
            <Tag
              key={block.key}
              className={cn(
                "font-semibold leading-tight text-slate-950 dark:text-white",
                block.level === 1 && "pb-1 pt-1 text-3xl",
                block.level === 2 && "pb-0.5 pt-5 text-xl",
                block.level === 3 && "pb-0.5 pt-4 text-lg",
              )}
            >
              {renderInline(block.text)}
            </Tag>
          );
        }

        if (block.type === "checkbox") {
          return (
            <button
              key={block.key}
              type="button"
              className="group flex w-full items-start gap-3 rounded-2xl border border-transparent px-2.5 py-2.5 text-left transition hover:border-teal-500/20 hover:bg-teal-500/[0.065] focus:outline-none focus:ring-4 focus:ring-teal-500/10"
              onClick={() => onToggleCheckbox(block.lineIndex)}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                  block.checked
                    ? "scale-100 border-teal-500 bg-teal-500 text-white shadow-sm shadow-teal-500/25"
                    : "border-slate-300 bg-white/60 text-transparent group-hover:scale-105 group-hover:border-teal-400 dark:border-slate-600 dark:bg-white/[0.06]",
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span
                className={cn(
                  "min-w-0 leading-7 transition",
                  block.checked && "text-slate-400 line-through decoration-slate-400/70 dark:text-slate-500",
                )}
              >
                {renderInline(block.text || "Untitled task")}
              </span>
            </button>
          );
        }

        if (block.type === "bullet") {
          return (
            <div key={block.key} className="flex gap-3 px-2.5 leading-7">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/70" />
              <span>{renderInline(block.text)}</span>
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={block.key}
              className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-slate-950/95 p-4 text-sm leading-6 text-slate-100 shadow-sm dark:border-white/[0.08]"
            >
              <code>{block.text}</code>
            </pre>
          );
        }

        if (block.type === "rule") {
          return <hr key={block.key} className="my-6 border-black/[0.08] dark:border-white/[0.08]" />;
        }

        return (
          <p key={block.key} className="px-2.5 leading-8">
            {renderInline(block.text)}
          </p>
        );
      })}
    </article>
  );
}

function parseMarkdown(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;

  function flushParagraph(lineIndex: number) {
    const text = paragraph.join(" ").replace(/\s+/g, " ").trim();

    if (text) {
      blocks.push({ type: "paragraph", text, key: `p-${lineIndex}-${blocks.length}` });
    }

    paragraph = [];
  }

  function flushCode(lineIndex: number) {
    blocks.push({ type: "code", text: code.join("\n"), key: `code-${lineIndex}-${blocks.length}` });
    code = [];
  }

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode(lineIndex);
        inCode = false;
      } else {
        flushParagraph(lineIndex);
        inCode = true;
      }
      return;
    }

    if (inCode) {
      code.push(rawLine);
      return;
    }

    if (!trimmed) {
      flushParagraph(lineIndex);
      return;
    }

    const checkboxMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (checkboxMatch) {
      flushParagraph(lineIndex);
      blocks.push({
        type: "checkbox",
        checked: checkboxMatch[1]?.toLowerCase() === "x",
        text: checkboxMatch[2] ?? "",
        lineIndex,
        key: `check-${lineIndex}`,
      });
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(lineIndex);
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
        key: `h-${lineIndex}`,
      });
      return;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph(lineIndex);
      blocks.push({ type: "rule", key: `rule-${lineIndex}` });
      return;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph(lineIndex);
      blocks.push({
        type: "bullet",
        text: bulletMatch[1],
        key: `bullet-${lineIndex}`,
      });
      return;
    }

    paragraph.push(trimmed);
  });

  if (inCode) {
    flushCode(lines.length);
  }

  flushParagraph(lines.length);
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-black/10 bg-black/[0.04] px-1.5 py-0.5 text-[0.86em] dark:border-white/10 dark:bg-white/[0.08]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
