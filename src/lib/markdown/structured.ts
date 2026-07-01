export type ChecklistItem = {
  checked: boolean;
  text: string;
};

export type ChecklistCategory = {
  name: string;
  items: ChecklistItem[];
};

export type TableData = {
  headers: string[];
  rows: string[][];
};

export type StructuredNote =
  | { kind: "checklist"; title: string; categories: ChecklistCategory[] }
  | { kind: "table"; title: string; table: TableData }
  | null;

const CHECKLIST_MARKER = "<!-- notka:type=checklist -->";
const TABLE_MARKER = "<!-- notka:type=table -->";

export function parseStructuredNote(content: string): StructuredNote {
  const normalized = content.replace(/\r\n/g, "\n");

  if (normalized.includes(CHECKLIST_MARKER)) {
    return parseChecklist(normalized);
  }

  if (normalized.includes(TABLE_MARKER)) {
    return parseTable(normalized);
  }

  if (isPureChecklist(normalized)) {
    return parseChecklist(`${CHECKLIST_MARKER}\n${normalized}`);
  }

  return null;
}

export function buildChecklistMarkdown(title: string, categories: ChecklistCategory[]) {
  const normalizedCategories = normalizeChecklistCategories(categories);
  const body = normalizedCategories
    .map((category) => {
      const items = category.items
        .map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`)
        .join("\n");

      return `## ${cleanTitle(category.name, "Checklist")}\n${items}`;
    })
    .join("\n\n");

  return `${CHECKLIST_MARKER}\n# ${cleanTitle(title, "Checklist")}\n\n${body}\n`;
}

export function buildTableMarkdown(title: string, table: TableData) {
  const headers = table.headers.length > 0 ? table.headers : ["Column 1"];
  const rows = table.rows.length > 0 ? table.rows : [headers.map(() => "")];
  const headerLine = `| ${headers.map(escapeTableCell).join(" | ")} |`;
  const dividerLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => {
    const cells = headers.map((_, index) => escapeTableCell(row[index] ?? ""));
    return `| ${cells.join(" | ")} |`;
  });

  return `${TABLE_MARKER}\n# ${cleanTitle(title, "Table")}\n\n${[
    headerLine,
    dividerLine,
    ...rowLines,
  ].join("\n")}\n`;
}

function parseChecklist(content: string) {
  const title = extractTitle(content, "Checklist");
  const categories: ChecklistCategory[] = [];
  let currentCategory: ChecklistCategory | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      currentCategory = {
        name: headingMatch[1]?.trim() || "Checklist",
        items: [],
      };
      categories.push(currentCategory);
      continue;
    }

    const itemMatch = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);

    if (!itemMatch) {
      continue;
    }

    if (!currentCategory) {
      currentCategory = {
        name: "Checklist",
        items: [],
      };
      categories.push(currentCategory);
    }

    currentCategory.items.push({
      checked: itemMatch[1]?.toLowerCase() === "x",
      text: itemMatch[2] ?? "",
    });
  }

  return {
    kind: "checklist" as const,
    title,
    categories: normalizeChecklistCategories(categories),
  };
}

function parseTable(content: string) {
  const title = extractTitle(content, "Table");
  const tableLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
  const headers = tableLines[0] ? splitTableLine(tableLines[0]) : ["Column 1", "Column 2"];
  const dataLines = tableLines.slice(2);
  const rows =
    dataLines.length > 0
      ? dataLines.map((line) => normalizeRow(splitTableLine(line), headers.length))
      : [headers.map(() => "")];

  return {
    kind: "table" as const,
    title,
    table: {
      headers,
      rows,
    },
  };
}

function isPureChecklist(content: string) {
  const meaningfulLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("<!--"));

  if (meaningfulLines.length < 2 || !meaningfulLines[0].startsWith("# ")) {
    return false;
  }

  return meaningfulLines.slice(1).every((line) => /^[-*]\s+\[[ xX]\]\s*/.test(line));
}

function normalizeChecklistCategories(categories: ChecklistCategory[]) {
  const normalized = categories.map((category, index) => ({
    name: cleanTitle(category.name, index === 0 ? "Checklist" : `Category ${index + 1}`),
    items: category.items,
  }));

  return normalized.length > 0
    ? normalized
    : [{ name: "Checklist", items: [{ checked: false, text: "" }] }];
}

function extractTitle(content: string, fallback: string) {
  const title = content
    .split("\n")
    .find((line) => /^#\s+/.test(line.trim()))
    ?.replace(/^#\s+/, "")
    .trim();

  return title || fallback;
}

function cleanTitle(value: string, fallback: string) {
  return value.replace(/\s+/g, " ").trim() || fallback;
}

function splitTableLine(line: string) {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of body) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeRow(row: string[], length: number) {
  return Array.from({ length }, (_, index) => row[index] ?? "");
}

function escapeTableCell(value: string) {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}
