"use client";

import {
  Bell,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  Code2,
  Columns2,
  Eye,
  FilePlus2,
  FolderInput,
  Pin,
  PinOff,
  Plus,
  Save,
  Table2,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  ChangeEvent,
  KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { Button } from "@/components/ui/button";
import { formatAlertDeadline, getAlertTone } from "@/lib/alerts";
import {
  buildChecklistMarkdown,
  buildTableMarkdown,
  parseStructuredNote,
  type ChecklistCategory,
  type ChecklistItem,
  type StructuredNote,
  type TableData,
} from "@/lib/markdown/structured";
import type { NoteDetailDto, NoteScope, TemplateDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "saving" | "unsaved";
type ViewMode = "editor" | "preview" | "split";

type NoteEditorProps = {
  note: NoteDetailDto;
  scope: NoteScope;
  folderPath: string;
  templates: TemplateDto[];
  onSaved: (note: NoteDetailDto) => void;
  onDeleted: (noteId: string) => void;
  onCreateTemplate: (noteId: string) => void;
  onCreateFromTemplate: (templateId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function NoteEditor({
  note,
  scope,
  folderPath,
  templates,
  onSaved,
  onDeleted,
  onCreateTemplate,
  onCreateFromTemplate,
  onDirtyChange,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [titleDirty, setTitleDirty] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "blank");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [alertMenuOpen, setAlertMenuOpen] = useState(false);
  const [alertInput, setAlertInput] = useState(() => toDatetimeLocalValue(note.alertAt));
  const [alertSaving, setAlertSaving] = useState(false);
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const [calendarInput, setCalendarInput] = useState(() => toDatetimeLocalValue(note.calendarAt));
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const activeNoteIdRef = useRef(note.id);
  const mountedRef = useRef(true);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const structuredNote = useMemo(() => parseStructuredNote(content), [content]);
  const liveChecklist = useMemo(() => {
    if (structuredNote?.kind === "checklist") {
      const items = structuredNote.categories.flatMap((category) => category.items);

      return {
        total: items.length,
        completed: items.filter((item) => item.checked).length,
      };
    }

    return countChecklist(content);
  }, [content, structuredNote]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setViewMode("editor");
    }
  }, []);

  useEffect(() => {
    setAlertInput(toDatetimeLocalValue(note.alertAt));
  }, [note.alertAt]);

  useEffect(() => {
    setCalendarInput(toDatetimeLocalValue(note.calendarAt));
  }, [note.calendarAt]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const saveNote = useCallback(async (forceTitle: boolean) => {
    if (status === "saving") {
      return;
    }

    const includeTitle = forceTitle || titleDirty;
    const payload: Record<string, unknown> = {
      content,
      scope,
    };

    if (includeTitle) {
      payload.title = title;
    }

    const savedTitle = title;
    const savedContent = content;
    setStatus("saving");

    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    if (!mountedRef.current) {
      return;
    }

    if (!response.ok) {
      setStatus("unsaved");
      return;
    }

    if (!mountedRef.current || activeNoteIdRef.current !== note.id) {
      return;
    }

    const contentStillCurrent = contentRef.current === savedContent;
    const titleStillCurrent = titleRef.current === savedTitle;

    if (contentStillCurrent && titleStillCurrent) {
      const updated = body.note as NoteDetailDto;
      onSaved(updated);
      setContent(updated.content);
      setTitle(updated.title);
      titleRef.current = updated.title;
      contentRef.current = updated.content;
      setTitleDirty(false);
      setDirty(false);
      setStatus("saved");
    } else {
      setDirty(true);
      setStatus("unsaved");
    }
  }, [content, note.id, onSaved, scope, status, title, titleDirty]);

  useEffect(() => {
    onDirtyChange?.(dirty || status === "saving");
  }, [dirty, onDirtyChange, status]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveNote(false);
    }, 850);

    return () => window.clearTimeout(timeout);
  }, [dirty, saveNote]);

  function changeTitle(event: ChangeEvent<HTMLInputElement>) {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    titleRef.current = nextTitle;
    setTitleDirty(true);

    if (structuredNote?.kind === "checklist") {
      markContentDirty(buildChecklistMarkdown(nextTitle, structuredNote.categories));
      return;
    }

    if (structuredNote?.kind === "table") {
      markContentDirty(buildTableMarkdown(nextTitle, structuredNote.table));
      return;
    }

    setDirty(true);
    setStatus("unsaved");
  }

  function changeContent(event: ChangeEvent<HTMLTextAreaElement>) {
    markContentDirty(event.target.value);
  }

  function markContentDirty(value: string) {
    setContent(value);
    contentRef.current = value;
    setDirty(true);
    setStatus("unsaved");
  }

  function changeChecklist(categories: ChecklistCategory[]) {
    markContentDirty(buildChecklistMarkdown(titleRef.current, categories));
  }

  function addChecklistCategory() {
    if (structuredNote?.kind !== "checklist") {
      return;
    }

    markContentDirty(
      buildChecklistMarkdown(titleRef.current, [
        ...structuredNote.categories,
        {
          name: `Category ${structuredNote.categories.length + 1}`,
          items: [{ checked: false, text: "" }],
        },
      ]),
    );
  }

  function changeTable(table: TableData) {
    markContentDirty(buildTableMarkdown(titleRef.current, table));
  }

  function toggleCheckboxLine(lineIndex: number) {
    const lines = contentRef.current.replace(/\r\n/g, "\n").split("\n");
    const line = lines[lineIndex];

    if (!line) {
      return;
    }

    const match = line.match(/^(\s*[-*]\s+\[)([ xX])(\]\s*.*)$/);

    if (!match) {
      return;
    }

    const checked = match[2].toLowerCase() === "x";
    lines[lineIndex] = `${match[1]}${checked ? " " : "x"}${match[3]}`;
    markContentDirty(lines.join("\n"));
  }

  async function togglePin() {
    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned, scope }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      onSaved(body.note as NoteDetailDto);
    }
  }

  async function saveAlert() {
    if (!alertInput) {
      return;
    }

    const deadline = new Date(alertInput);

    if (Number.isNaN(deadline.getTime())) {
      return;
    }

    setAlertSaving(true);
    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertAt: deadline.toISOString(), scope }),
    });
    const body = await response.json().catch(() => ({}));
    setAlertSaving(false);

    if (response.ok) {
      onSaved(body.note as NoteDetailDto);
      setAlertMenuOpen(false);
    }
  }

  async function deleteAlert() {
    setAlertSaving(true);
    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertAt: null, scope }),
    });
    const body = await response.json().catch(() => ({}));
    setAlertSaving(false);

    if (response.ok) {
      onSaved(body.note as NoteDetailDto);
      setAlertInput("");
      setAlertMenuOpen(false);
    }
  }

  async function saveCalendarEntry() {
    if (!calendarInput) {
      return;
    }

    const calendarDate = new Date(calendarInput);

    if (Number.isNaN(calendarDate.getTime())) {
      return;
    }

    setCalendarSaving(true);
    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarAt: calendarDate.toISOString(), scope }),
    });
    const body = await response.json().catch(() => ({}));
    setCalendarSaving(false);

    if (response.ok) {
      onSaved(body.note as NoteDetailDto);
      setCalendarMenuOpen(false);
    }
  }

  async function deleteCalendarEntry() {
    setCalendarSaving(true);
    const response = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarAt: null, scope }),
    });
    const body = await response.json().catch(() => ({}));
    setCalendarSaving(false);

    if (response.ok) {
      onSaved(body.note as NoteDetailDto);
      setCalendarInput("");
      setCalendarMenuOpen(false);
    }
  }

  async function deleteNote() {
    if (!window.confirm("Move this note to trash?")) {
      return;
    }

    const response = await fetch(`/api/notes/${note.id}?scope=${scope}`, { method: "DELETE" });

    if (response.ok) {
      onDeleted(note.id);
    }
  }

  function handleShortcut(event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveNote(true);
    }
  }

  async function createTemplateFromCurrent() {
    if (dirty) {
      await saveNote(true);
    }

    onCreateTemplate(note.id);
  }

  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const alertTone = getAlertTone(note.alertAt);
  const alertLabel = formatAlertDeadline(note.alertAt);
  const calendarLabel = formatCalendarDate(note.calendarAt);
  const showStructuredEditor = structuredNote !== null;
  const showEditor = !showStructuredEditor && (viewMode === "editor" || viewMode === "split");
  const showPreview = !showStructuredEditor && (viewMode === "preview" || viewMode === "split");

  return (
    <section className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <header className="flex flex-col gap-3 border-b border-black/[0.08] p-4 dark:border-white/[0.09] lg:flex-row lg:items-center lg:justify-between">
        <input
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold leading-tight text-slate-950 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white sm:text-[1.65rem]"
          value={title}
          onChange={changeTitle}
          onKeyDown={handleShortcut}
          placeholder="Untitled note"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              status === "saved" &&
                "border-emerald-500/10 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              status === "saving" &&
                "border-teal-500/10 bg-teal-500/10 text-teal-700 dark:text-teal-300",
              status === "unsaved" &&
                "border-amber-500/10 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {status === "saved" ? "Saved" : status === "saving" ? "Saving..." : "Unsaved"}
          </span>
          <Button
            type="button"
            variant="icon"
            title="Save"
            aria-label="Save note"
            onClick={() => void saveNote(true)}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="icon"
            title={note.pinned ? "Unpin" : "Pin"}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            onClick={togglePin}
          >
            {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="icon"
            title="Delete"
            aria-label="Delete note"
            onClick={deleteNote}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-black/[0.08] p-3 dark:border-white/[0.09]">
        <div className="flex h-10 w-full flex-none items-center gap-2 rounded-xl border border-black/[0.08] bg-white/45 px-3 text-sm text-slate-500 dark:border-white/[0.09] dark:bg-white/[0.055] dark:text-slate-300 sm:w-64 md:w-72">
          <FolderInput className="h-4 w-4 shrink-0" />
          <span className="shrink-0 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            Folder
          </span>
          <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-100">
            {folderPath}
          </span>
        </div>

        {structuredNote ? (
          <div className="muted-button pointer-events-none h-10 px-3 text-xs uppercase tracking-wide">
            {structuredNote.kind === "checklist" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Table2 className="h-4 w-4" />
            )}
            {structuredNote.kind === "checklist" ? "Checklist" : "Table"}
          </div>
        ) : (
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        )}

        <div className="relative min-w-0">
          <button
            className={cn(
              "muted-button h-10 px-3 text-xs uppercase tracking-wide",
              note.alertAt &&
                "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-200",
              alertTone === "yellow" &&
                "border-amber-400/25 bg-amber-500/10 text-amber-700 dark:text-amber-200",
              alertTone === "red" &&
                "border-rose-400/25 bg-rose-500/10 text-rose-700 dark:text-rose-200",
            )}
            type="button"
            title={alertLabel ? `Deadline ${alertLabel}` : "Set alert"}
            aria-label={alertLabel ? `Edit alert deadline ${alertLabel}` : "Set alert"}
            onClick={() => setAlertMenuOpen((open) => !open)}
          >
            <CalendarClock className="h-4 w-4" />
            Set alert
          </button>
          {alertMenuOpen ? (
            <div className="settings-popover fixed inset-x-3 top-32 z-30 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl p-3 sm:absolute sm:inset-x-auto sm:left-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(20rem,calc(100vw-2rem))]">
              <div className="mb-3 flex items-start gap-2">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal-500/15 bg-teal-500/10 text-teal-700 dark:text-teal-300",
                    alertTone === "yellow" &&
                      "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    alertTone === "red" &&
                      "border-rose-400/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                  )}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Deadline
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400 dark:text-slate-500">
                    {alertLabel ? `Set for ${alertLabel}` : "Show this note before the deadline."}
                  </p>
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  Date and time
                </span>
                <input
                  className="notka-input h-10 py-0"
                  type="datetime-local"
                  value={alertInput}
                  onChange={(event) => setAlertInput(event.target.value)}
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!alertInput || alertSaving}
                  onClick={() => void saveAlert()}
                >
                  {note.alertAt ? "Edit alert" : "Set alert"}
                </Button>
                {note.alertAt ? (
                  <Button
                    type="button"
                    disabled={alertSaving}
                    onClick={() => void deleteAlert()}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative min-w-0">
          <button
            className={cn(
              "muted-button h-10 px-3 text-xs uppercase tracking-wide",
              note.calendarAt &&
                "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-200",
            )}
            type="button"
            title={calendarLabel ? `Calendar ${calendarLabel}` : "Add to calendar"}
            aria-label={calendarLabel ? `Edit calendar date ${calendarLabel}` : "Add to calendar"}
            onClick={() => setCalendarMenuOpen((open) => !open)}
          >
            <CalendarPlus className="h-4 w-4" />
            Add to calendar
          </button>
          {calendarMenuOpen ? (
            <div className="settings-popover fixed inset-x-3 top-32 z-30 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl p-3 sm:absolute sm:inset-x-auto sm:left-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(20rem,calc(100vw-2rem))]">
              <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal-500/15 bg-teal-500/10 text-teal-700 dark:text-teal-300">
                  <CalendarPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Calendar
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400 dark:text-slate-500">
                    {calendarLabel ? `Added for ${calendarLabel}` : "Add this note to the calendar."}
                  </p>
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  Date and time
                </span>
                <input
                  className="notka-input h-10 py-0"
                  type="datetime-local"
                  value={calendarInput}
                  onChange={(event) => setCalendarInput(event.target.value)}
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!calendarInput || calendarSaving}
                  onClick={() => void saveCalendarEntry()}
                >
                  {note.calendarAt ? "Edit calendar" : "Add to calendar"}
                </Button>
                {note.calendarAt ? (
                  <Button
                    type="button"
                    disabled={calendarSaving}
                    onClick={() => void deleteCalendarEntry()}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ml-0 flex w-full min-w-0 items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          {structuredNote?.kind === "checklist" ? (
            <Button
              type="button"
              variant="primary"
              className="h-10 px-3"
              onClick={addChecklistCategory}
            >
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          ) : null}

          <div className="relative">
            <button
              className="muted-button h-10 px-3"
              type="button"
              title="Templates"
              aria-label="Open template actions"
              onClick={() => setTemplateMenuOpen((open) => !open)}
            >
              <FilePlus2 className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition", templateMenuOpen && "rotate-180")}
              />
            </button>
            {templateMenuOpen ? (
              <div className="settings-popover fixed inset-x-3 top-32 z-20 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl p-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(18rem,calc(100vw-2rem))]">
                <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  New from template
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={`${template.builtIn ? "built-in" : "user"}-${template.id}`}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-teal-500/15 dark:text-slate-300 dark:hover:bg-white/[0.08]",
                        template.id === templateId &&
                          "bg-teal-500/10 text-teal-700 dark:text-teal-200",
                      )}
                      type="button"
                      onClick={() => setTemplateId(template.id)}
                    >
                      <span className="min-w-0 truncate">{template.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid gap-2 border-t border-black/[0.08] pt-2 dark:border-white/[0.09]">
                  <Button
                    type="button"
                    className="justify-start"
                    onClick={() => {
                      setTemplateMenuOpen(false);
                      onCreateFromTemplate(templateId);
                    }}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    New from {selectedTemplate?.name ?? "template"}
                  </Button>
                  <Button
                    type="button"
                    className="justify-start"
                    onClick={() => {
                      setTemplateMenuOpen(false);
                      void createTemplateFromCurrent();
                    }}
                  >
                    <WandSparkles className="h-4 w-4" />
                    Save current as template
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {structuredNote ? (
        <StructuredEditor
          note={structuredNote}
          onChecklistChange={changeChecklist}
          onTableChange={changeTable}
          onKeyDown={handleShortcut}
        />
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1",
            viewMode === "split"
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]"
              : "grid-cols-1",
          )}
        >
          {showEditor ? (
            <div
              className={cn(
                "min-h-[34rem]",
                viewMode === "split" &&
                  "border-b border-black/[0.08] dark:border-white/[0.09] lg:min-h-0 lg:border-b-0 lg:border-r",
              )}
            >
              <textarea
                className="notka-textarea h-full min-h-[34rem] p-5 sm:p-7 lg:min-h-0"
                value={content}
                onChange={changeContent}
                onKeyDown={handleShortcut}
                spellCheck
                placeholder="# Untitled note"
              />
            </div>
          ) : null}
          {showPreview ? (
            <aside
              className={cn(
                "min-h-[34rem] overflow-y-auto px-5 py-5 sm:px-8 sm:py-7",
                viewMode === "preview" && "mx-auto w-full max-w-4xl",
              )}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  Preview
                </h2>
                {liveChecklist.total > 0 ? (
                  <span className="notka-badge">
                    {liveChecklist.completed}/{liveChecklist.total}
                  </span>
                ) : null}
              </div>
              <MarkdownPreview content={content} onToggleCheckbox={toggleCheckboxLine} />
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}

function StructuredEditor({
  note,
  onChecklistChange,
  onTableChange,
  onKeyDown,
}: {
  note: NonNullable<StructuredNote>;
  onChecklistChange: (categories: ChecklistCategory[]) => void;
  onTableChange: (table: TableData) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  if (note.kind === "checklist") {
    return (
      <ChecklistBuilder
        categories={note.categories}
        onChange={onChecklistChange}
        onKeyDown={onKeyDown}
      />
    );
  }

  return <TableBuilder table={note.table} onChange={onTableChange} onKeyDown={onKeyDown} />;
}

function ChecklistBuilder({
  categories,
  onChange,
  onKeyDown,
}: {
  categories: ChecklistCategory[];
  onChange: (categories: ChecklistCategory[]) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  function updateCategory(categoryIndex: number, patch: Partial<ChecklistCategory>) {
    onChange(
      categories.map((category, index) =>
        index === categoryIndex ? { ...category, ...patch } : category,
      ),
    );
  }

  function updateItem(categoryIndex: number, itemIndex: number, patch: Partial<ChecklistItem>) {
    onChange(
      categories.map((category, index) => {
        if (index !== categoryIndex) {
          return category;
        }

        return {
          ...category,
          items: category.items.map((item, currentItemIndex) =>
            currentItemIndex === itemIndex ? { ...item, ...patch } : item,
          ),
        };
      }),
    );
  }

  function deleteCategory(categoryIndex: number) {
    const category = categories[categoryIndex];

    if (!category) {
      return;
    }

    if (!window.confirm(`Delete "${category.name}" and its entries?`)) {
      return;
    }

    const nextCategories = categories.filter((_, index) => index !== categoryIndex);

    onChange(
      nextCategories.length > 0
        ? nextCategories
        : [{ name: "Checklist", items: [{ checked: false, text: "" }] }],
    );
  }

  function addEntry(categoryIndex: number) {
    onChange(
      categories.map((category, index) =>
        index === categoryIndex
          ? { ...category, items: [...category.items, { checked: false, text: "" }] }
          : category,
      ),
    );
  }

  function deleteEntry(categoryIndex: number, itemIndex: number) {
    onChange(
      categories.map((category, index) => {
        if (index !== categoryIndex) {
          return category;
        }

        return {
          ...category,
          items: category.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
        };
      }),
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="space-y-8">
          {categories.map((category, categoryIndex) => {
            const categoryCompleted = category.items.filter((item) => item.checked).length;

            return (
              <section key={categoryIndex} className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <input
                    className="w-full min-w-0 flex-1 bg-transparent text-xs font-semibold uppercase text-slate-400 outline-none transition placeholder:text-slate-500 focus:text-slate-700 focus:ring-0 dark:text-slate-500 dark:focus:text-slate-300 sm:w-auto"
                    value={category.name}
                    onChange={(event) =>
                      updateCategory(categoryIndex, { name: event.target.value })
                    }
                    onKeyDown={onKeyDown}
                    placeholder="Category"
                    aria-label="Category name"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="notka-badge">
                      {categoryCompleted}/{category.items.length}
                    </span>
                    <Button
                      type="button"
                      className="h-9 px-3"
                      onClick={() => addEntry(categoryIndex)}
                    >
                      <Plus className="h-4 w-4" />
                      Add entry
                    </Button>
                    <Button
                      type="button"
                      variant="icon"
                      title="Delete category"
                      aria-label={`Delete category ${category.name}`}
                      onClick={() => deleteCategory(categoryIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className={cn(
                        "group flex min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-3 transition",
                        item.checked
                          ? "border-black/[0.06] bg-white/25 opacity-75 dark:border-white/[0.06] dark:bg-white/[0.025]"
                          : "border-teal-500/10 bg-white/45 shadow-sm shadow-slate-950/[0.03] hover:border-teal-500/25 dark:bg-white/[0.04] dark:shadow-black/10",
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-500/15",
                          item.checked
                            ? "scale-100 border-teal-500 bg-teal-500 text-white shadow-sm shadow-teal-500/25"
                            : "border-slate-300 bg-white/60 text-transparent group-hover:scale-105 group-hover:border-teal-400 dark:border-slate-600 dark:bg-white/[0.06]",
                        )}
                        title={item.checked ? "Mark as incomplete" : "Mark as complete"}
                        aria-label={item.checked ? "Mark as incomplete" : "Mark as complete"}
                        onClick={() =>
                          updateItem(categoryIndex, itemIndex, { checked: !item.checked })
                        }
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <input
                        className={cn(
                          "min-w-0 flex-1 bg-transparent text-base leading-7 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500",
                          item.checked && "text-slate-400 line-through decoration-slate-400/70 dark:text-slate-500",
                        )}
                        value={item.text}
                        onChange={(event) =>
                          updateItem(categoryIndex, itemIndex, { text: event.target.value })
                        }
                        onKeyDown={onKeyDown}
                        placeholder="New entry"
                      />
                      <Button
                        type="button"
                        variant="icon"
                        className="h-8 w-8 shrink-0 opacity-70 transition group-hover:opacity-100"
                        title="Delete entry"
                        aria-label={`Delete entry ${item.text || itemIndex + 1}`}
                        onClick={() => deleteEntry(categoryIndex, itemIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TableBuilder({
  table,
  onChange,
  onKeyDown,
}: {
  table: TableData;
  onChange: (table: TableData) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const headers = table.headers.length > 0 ? table.headers : ["Column 1"];
  const rows = table.rows.length > 0 ? table.rows : [headers.map(() => "")];

  function updateHeaders(nextHeaders: string[]) {
    onChange({
      headers: nextHeaders,
      rows: rows.map((row) => normalizeCells(row, nextHeaders.length)),
    });
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    onChange({
      headers,
      rows: rows.map((row, index) => {
        if (index !== rowIndex) {
          return normalizeCells(row, headers.length);
        }

        const nextRow = normalizeCells(row, headers.length);
        nextRow[columnIndex] = value;
        return nextRow;
      }),
    });
  }

  function addColumn() {
    const nextHeaders = [...headers, `Column ${headers.length + 1}`];
    onChange({
      headers: nextHeaders,
      rows: rows.map((row) => [...normalizeCells(row, headers.length), ""]),
    });
  }

  function addRow() {
    onChange({
      headers,
      rows: [...rows.map((row) => normalizeCells(row, headers.length)), headers.map(() => "")],
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              Table
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={addColumn}>
              <Plus className="h-4 w-4" />
              Add column
            </Button>
            <Button type="button" variant="primary" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add row
            </Button>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto rounded-2xl border border-black/[0.08] bg-white/35 shadow-sm shadow-slate-950/[0.03] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/10">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr>
                {headers.map((header, columnIndex) => (
                  <th
                    key={columnIndex}
                    className="border-b border-r border-black/[0.08] p-0 last:border-r-0 dark:border-white/[0.08]"
                  >
                    <input
                      className="w-full bg-transparent px-4 py-3 text-left text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:bg-teal-500/[0.06] focus:ring-0 dark:text-white dark:placeholder:text-slate-500"
                      value={header}
                      onChange={(event) => {
                        const nextHeaders = [...headers];
                        nextHeaders[columnIndex] = event.target.value;
                        updateHeaders(nextHeaders);
                      }}
                      onKeyDown={onKeyDown}
                      placeholder={`Column ${columnIndex + 1}`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="border-b border-r border-black/[0.06] p-0 last:border-r-0 dark:border-white/[0.06]"
                    >
                      <input
                        className="w-full bg-transparent px-4 py-3 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:bg-teal-500/[0.06] focus:ring-0 dark:text-slate-200 dark:placeholder:text-slate-500"
                        value={row[columnIndex] ?? ""}
                        onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Empty"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button type="button" className="self-start" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      </div>
    </div>
  );
}

function normalizeCells(row: string[], length: number) {
  return Array.from({ length }, (_, index) => row[index] ?? "");
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  const options: Array<{ value: ViewMode; label: string; icon: ReactNode }> = [
    { value: "editor", label: "Markdown", icon: <Code2 className="h-3.5 w-3.5" /> },
    { value: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
    { value: "split", label: "Split", icon: <Columns2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="segmented-control" role="group" aria-label="Note view mode">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "segmented-button inline-flex items-center gap-1.5",
            value === option.value && "segmented-button-active",
          )}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function countChecklist(content: string) {
  const matches = Array.from(content.matchAll(/^\s*[-*]\s+\[([ xX])\]\s+/gm));

  return {
    total: matches.length,
    completed: matches.filter((match) => match[1]?.toLowerCase() === "x").length,
  };
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatCalendarDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
