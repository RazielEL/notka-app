"use client";

import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  PanelLeftOpen,
  Pin,
  Plus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Sidebar } from "@/components/app-shell/sidebar";
import { NoteEditor } from "@/components/editor/note-editor";
import { Button } from "@/components/ui/button";
import { formatAlertDeadline, getAlertTone, type AlertTone } from "@/lib/alerts";
import { localeForLanguage, translateFolderName, type Language } from "@/lib/i18n";
import {
  defaultPreferences,
  isColorThemeId,
  isFontChoiceId,
  sanitizeCustomThemeCss,
  type UserPreferences,
} from "@/lib/preferences";
import type {
  AppUserDto,
  AuthUser,
  FolderDto,
  NoteDetailDto,
  NoteScope,
  NoteSummaryDto,
  TemplateDto,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type AppArea = "personal" | "group" | "calendar";

type NotkaAppProps = {
  user: AuthUser;
  initialFolders: FolderDto[];
  initialNotes: NoteSummaryDto[];
  initialTemplates: TemplateDto[];
  defaultFolderId: string;
};

export function NotkaApp({
  user,
  initialFolders,
  initialNotes,
  initialTemplates,
  defaultFolderId,
}: NotkaAppProps) {
  const router = useRouter();
  const { language, t } = useI18n();
  const [folders, setFolders] = useState(initialFolders);
  const [notes, setNotes] = useState(initialNotes);
  const [templates, setTemplates] = useState(initialTemplates);
  const [groupUsers, setGroupUsers] = useState<AppUserDto[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<NoteSummaryDto[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [showGroupCalendarNotes, setShowGroupCalendarNotes] = useState(false);
  const [activeArea, setActiveArea] = useState<AppArea>("personal");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolderId);
  const [selectedNote, setSelectedNote] = useState<NoteDetailDto | null>(null);
  const [search, setSearch] = useState("");
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [alertNow, setAlertNow] = useState(() => new Date());
  const [areaReady, setAreaReady] = useState(false);
  const [editorHasUnsavedChanges, setEditorHasUnsavedChanges] = useState(false);
  const listRequestIdRef = useRef(0);
  const noteRequestIdRef = useRef(0);
  const currentScope: NoteScope = activeArea === "group" ? "group" : "personal";

  const refreshFoldersAndNotes = useCallback(async (scope: NoteScope = currentScope) => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    const [foldersResponse, notesResponse] = await Promise.all([
      fetch(`/api/folders?scope=${scope}`),
      fetch(`/api/notes?scope=${scope}`),
    ]);

    if (listRequestIdRef.current !== requestId) {
      return;
    }

    if (foldersResponse.ok) {
      const body = await foldersResponse.json();
      setFolders((body.folders as FolderDto[]).sort(sortFolders));
    }

    if (notesResponse.ok) {
      const body = await notesResponse.json();
      setNotes(body.notes as NoteSummaryDto[]);
    }
  }, [currentScope]);

  const refreshCalendarNotes = useCallback(async () => {
    const response = await fetch(
      showGroupCalendarNotes ? "/api/calendar?includeGroup=true" : "/api/calendar",
    );

    if (response.ok) {
      const body = await response.json();
      setCalendarNotes(body.notes as NoteSummaryDto[]);
    }
  }, [showGroupCalendarNotes]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    setSidebarOpen(!query.matches);

    function handleChange(event: MediaQueryListEvent) {
      setSidebarOpen(!event.matches);
    }

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setAlertNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedArea = localStorage.getItem("notka-area");

    if (storedArea === "group" || storedArea === "calendar") {
      setActiveArea(storedArea);
    }

    setAreaReady(true);
  }, []);

  useEffect(() => {
    if (!areaReady) {
      return;
    }

    if (activeArea === "calendar") {
      void refreshCalendarNotes();
      return;
    }

    void refreshFoldersAndNotes(currentScope);
  }, [activeArea, areaReady, currentScope, refreshCalendarNotes, refreshFoldersAndNotes]);

  useEffect(() => {
    if (!areaReady || activeArea !== "group") {
      return;
    }

    void refreshGroupUsers();
  }, [activeArea, areaReady]);

  useEffect(() => {
    const storedMode = localStorage.getItem("notka-mode");
    const storedTheme = localStorage.getItem("notka-color-theme");
    const storedFont = localStorage.getItem("notka-font");
    const storedSide = localStorage.getItem("notka-sidebar-side");
    const storedCustomThemeCss = localStorage.getItem("notka-custom-theme-css");
    const storedCalendarGroups = localStorage.getItem("notka-calendar-show-group");

    setShowGroupCalendarNotes(storedCalendarGroups === "true");
    setPreferences({
      mode: storedMode === "light" || storedMode === "dark" ? storedMode : defaultPreferences.mode,
      colorTheme:
        storedTheme && isColorThemeId(storedTheme)
          ? storedTheme
          : defaultPreferences.colorTheme,
      font: storedFont && isFontChoiceId(storedFont) ? storedFont : defaultPreferences.font,
      sidebarSide:
        storedSide === "left" || storedSide === "right"
          ? storedSide
          : defaultPreferences.sidebarSide,
      customThemeCss: storedCustomThemeCss ?? defaultPreferences.customThemeCss,
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("notka-calendar-show-group", String(showGroupCalendarNotes));
  }, [showGroupCalendarNotes]);

  useEffect(() => {
    const sanitizedCustomCss = sanitizeCustomThemeCss(preferences.customThemeCss);
    let style = document.getElementById("notka-custom-theme");

    document.documentElement.classList.toggle("dark", preferences.mode === "dark");
    document.documentElement.dataset.theme = preferences.colorTheme;
    document.documentElement.dataset.appFont = preferences.font;
    if (!style && sanitizedCustomCss) {
      style = document.createElement("style");
      style.id = "notka-custom-theme";
      document.head.appendChild(style);
    }
    if (style) {
      style.textContent = sanitizedCustomCss ? `:root {\n${sanitizedCustomCss}\n}` : "";
    }
    localStorage.setItem("notka-mode", preferences.mode);
    localStorage.setItem("notka-color-theme", preferences.colorTheme);
    localStorage.setItem("notka-font", preferences.font);
    localStorage.setItem("notka-sidebar-side", preferences.sidebarSide);
    localStorage.setItem("notka-custom-theme-css", sanitizedCustomCss);
  }, [preferences]);

  useEffect(() => {
    if (activeArea === "calendar") {
      return;
    }

    const storedFolderId = localStorage.getItem(folderStorageKey(currentScope));

    if (storedFolderId === "all") {
      setSelectedFolderId(null);
      return;
    }

    if (storedFolderId && folders.some((folder) => folder.id === storedFolderId)) {
      setSelectedFolderId(storedFolderId);
      return;
    }

    setSelectedFolderId(getDefaultFolderId(folders, currentScope, defaultFolderId));
  }, [activeArea, currentScope, defaultFolderId, folders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matchesSearch = (note: NoteSummaryDto) =>
      !query ||
      note.title.toLowerCase().includes(query) ||
      (note.excerpt ?? "").toLowerCase().includes(query);

    return {
      pinnedNotes: notes.filter((note) => note.pinned && matchesSearch(note)),
      sidebarNotes: notes.filter(matchesSearch).sort(sortNotesByUpdated),
      notes: notes
        .filter((note) => {
          if (query) {
            return matchesSearch(note);
          }

          if (selectedFolderId === null) {
            return true;
          }

          return note.folderId === selectedFolderId;
        })
        .sort(sortNotesByUpdated),
    };
  }, [notes, search, selectedFolderId]);
  const alertShortcutNote = useMemo(
    () =>
      notes
        .filter((note) => getAlertTone(note.alertAt, alertNow) === "red")
        .sort((a, b) => (a.alertAt ?? "").localeCompare(b.alertAt ?? ""))[0] ?? null,
    [alertNow, notes],
  );
  const visibleCalendarNotes = useMemo(
    () =>
      calendarNotes.filter((note) => note.scope === "personal" || showGroupCalendarNotes),
    [calendarNotes, showGroupCalendarNotes],
  );

  function selectFolder(folderId: string) {
    noteRequestIdRef.current += 1;
    setSelectedFolderId(folderId);
    setSelectedNote(null);
    setLoadingNoteId(null);
    setEditorHasUnsavedChanges(false);
    localStorage.setItem(folderStorageKey(currentScope), folderId);
    closeSidebarOnMobile();
  }

  function selectAllNotes() {
    noteRequestIdRef.current += 1;
    setSelectedFolderId(null);
    setSelectedNote(null);
    setLoadingNoteId(null);
    setEditorHasUnsavedChanges(false);
    localStorage.setItem(folderStorageKey(currentScope), "all");
    closeSidebarOnMobile();
  }

  async function selectNote(noteId: string) {
    await selectNoteByScope(noteId, currentScope);
  }

  async function selectNoteByScope(noteId: string, scope: NoteScope) {
    const requestId = noteRequestIdRef.current + 1;
    noteRequestIdRef.current = requestId;
    setLoadingNoteId(noteId);
    const response = await fetch(`/api/notes/${noteId}?scope=${scope}`);
    const body = await response.json().catch(() => ({}));

    if (noteRequestIdRef.current !== requestId) {
      return;
    }

    setLoadingNoteId(null);

    if (response.ok) {
      setSelectedNote(body.note as NoteDetailDto);
      closeSidebarOnMobile();
    }
  }

  async function selectCalendarNote(note: NoteSummaryDto) {
    listRequestIdRef.current += 1;
    noteRequestIdRef.current += 1;
    const nextArea: AppArea = note.scope === "group" ? "group" : "personal";
    setActiveArea(nextArea);
    setFolders([]);
    setNotes([]);
    setSelectedNote(null);
    setSelectedFolderId(note.folderId);
    setSearch("");
    setEditorHasUnsavedChanges(false);
    localStorage.setItem("notka-area", nextArea);

    if (note.folderId) {
      localStorage.setItem(folderStorageKey(note.scope), note.folderId);
    }

    await refreshFoldersAndNotes(note.scope);
    await selectNoteByScope(note.id, note.scope);
  }

  async function createNote(templateId?: string) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: selectedFolderId ?? undefined,
        templateId,
        scope: currentScope,
        language,
      }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      const note = body.note as NoteDetailDto;
      upsertNote(note);
      setSelectedNote(note);
      closeSidebarOnMobile();
    }
  }

  async function createFolder(name: string, parentFolderId?: string | null) {
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parentFolderId: parentFolderId ?? selectedFolderId,
        scope: currentScope,
      }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      const folder = body.folder as FolderDto;
      setFolders((current) => [...current, folder].sort(sortFolders));
      selectFolder(folder.id);
    }
  }

  async function renameFolder(folderId: string, name: string) {
    const response = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scope: currentScope }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      const folder = body.folder as FolderDto;
      setFolders((current) =>
        current.map((entry) => (entry.id === folder.id ? folder : entry)).sort(sortFolders),
      );
    }
  }

  async function moveFolder(folderId: string, parentFolderId: string | null) {
    const response = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentFolderId, scope: currentScope }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      const folder = body.folder as FolderDto;
      setFolders((current) =>
        current.map((entry) => (entry.id === folder.id ? folder : entry)).sort(sortFolders),
      );
    }
  }

  async function moveNoteToFolder(noteId: string, folderId: string) {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, scope: currentScope }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      const note = body.note as NoteDetailDto;
      upsertNote(note);

      if (selectedNote?.id === note.id) {
        setSelectedNote(note);
      }
    }
  }

  async function deleteFolder(folderId: string) {
    const response = await fetch(`/api/folders/${folderId}?moveToInbox=true&scope=${currentScope}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return;
    }

    await refreshFoldersAndNotes(currentScope);

    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function refreshGroupUsers() {
    const response = await fetch("/api/users");

    if (response.ok) {
      const body = await response.json();
      setGroupUsers(body.users as AppUserDto[]);
    }
  }

  async function createTemplate(noteId: string) {
    const fallback = selectedNote?.title
      ? t("editor.templateSuffix", { title: selectedNote.title })
      : t("editor.templateFallback");
    const name = window.prompt(t("editor.templateName"), fallback);

    if (!name?.trim()) {
      return;
    }

    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceNoteId: noteId, name, scope: currentScope }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      setTemplates((current) => [...current, body.template as TemplateDto]);
    }
  }

  function upsertNote(note: NoteDetailDto | NoteSummaryDto) {
    const summary = toSummary(note);
    setNotes((current) => {
      const exists = current.some((entry) => entry.id === summary.id);
      const next = exists
        ? current.map((entry) => (entry.id === summary.id ? summary : entry))
        : [summary, ...current];

      return next.sort(sortNotesByUpdated);
    });

    if (summary.alertAt || summary.calendarAt) {
      setCalendarNotes((current) => {
        const exists = current.some((entry) => entry.id === summary.id);
        const next = exists
          ? current.map((entry) => (entry.id === summary.id ? summary : entry))
          : [summary, ...current];

        return next.sort(sortNotesByUpdated);
      });
    } else {
      setCalendarNotes((current) => current.filter((entry) => entry.id !== summary.id));
    }
  }

  function handleSaved(note: NoteDetailDto) {
    upsertNote(note);
    setSelectedNote(note);
  }

  function handleDeleted(noteId: string) {
    noteRequestIdRef.current += 1;
    setNotes((current) => current.filter((note) => note.id !== noteId));
    setSelectedNote(null);
    setLoadingNoteId(null);
    setEditorHasUnsavedChanges(false);
  }

  function updatePreferences(next: Partial<UserPreferences>) {
    setPreferences((current) => ({ ...current, ...next }));
  }

  function changeArea(nextArea: AppArea) {
    if (nextArea === activeArea) {
      return;
    }

    if (
      editorHasUnsavedChanges &&
      !window.confirm(t("confirm.unsavedSwitch"))
    ) {
      return;
    }

    setActiveArea(nextArea);
    listRequestIdRef.current += 1;
    noteRequestIdRef.current += 1;
    setFolders([]);
    setNotes([]);
    setSelectedNote(null);
    setLoadingNoteId(null);
    setSearch("");
    setSelectedFolderId(null);
    setEditorHasUnsavedChanges(false);
    localStorage.setItem("notka-area", nextArea);
    localStorage.removeItem("notka-folder-id");

    if (nextArea === "calendar") {
      return;
    }

    const nextScope: NoteScope = nextArea === "group" ? "group" : "personal";
    const storedFolderId = localStorage.getItem(folderStorageKey(nextScope));

    if (storedFolderId === "all") {
      setSelectedFolderId(null);
    }
  }

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  }

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
  const selectedFolderPath =
    selectedFolderId === null
      ? `/${t("sidebar.allNotes")}`
      : buildFolderPath(folders, selectedFolderId, language);
  const sidebarPanel = sidebarOpen ? (
    <>
      <button
        className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm md:hidden"
        type="button"
        aria-label={t("sidebar.close")}
        onClick={() => setSidebarOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-y-2 z-40 w-[min(21rem,calc(100vw-1rem))] md:static md:z-auto md:w-80 md:flex-none",
          preferences.sidebarSide === "right" ? "right-3" : "left-3",
        )}
      >
        <Sidebar
          user={user}
          activeArea={activeArea}
          folders={folders}
          alertShortcutNote={alertShortcutNote}
          pinnedNotes={filtered.pinnedNotes}
          selectedFolderId={selectedFolderId}
          selectedNoteId={selectedNote?.id ?? loadingNoteId}
          notes={filtered.sidebarNotes}
          search={search}
          onSearchChange={setSearch}
          onAreaChange={changeArea}
          onSelectFolder={selectFolder}
          onSelectAllNotes={selectAllNotes}
          onSelectNote={selectNote}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onMoveFolder={moveFolder}
          onMoveNoteToFolder={moveNoteToFolder}
          onCloseSidebar={() => setSidebarOpen(false)}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          onLogout={logout}
        />
      </div>
    </>
  ) : null;
  const contentPanel = (
    <div className="min-w-0 flex-1">
      {activeArea === "calendar" ? (
        <CalendarView
          notes={visibleCalendarNotes}
          month={calendarMonth}
          showGroupNotes={showGroupCalendarNotes}
          onMonthChange={setCalendarMonth}
          onShowGroupNotesChange={setShowGroupCalendarNotes}
          onSelectNote={(note) => void selectCalendarNote(note)}
        />
      ) : selectedNote ? (
        <NoteEditor
          key={selectedNote.id}
          note={selectedNote}
          scope={currentScope}
          folderPath={buildFolderPath(folders, selectedNote.folderId, language)}
          templates={templates}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCreateTemplate={createTemplate}
          onCreateFromTemplate={(templateId) => void createNote(templateId)}
          onDirtyChange={setEditorHasUnsavedChanges}
        />
      ) : (
        <FolderOverview
          areaLabel={activeArea === "group" ? t("nav.groupNotes") : t("nav.personalNotes")}
          title={
            selectedFolderId === null
              ? t("sidebar.allNotes")
              : selectedFolder
                ? translateFolderName(language, selectedFolder.name)
                : t("folder.inbox")
          }
          path={selectedFolderPath}
          emptyText={activeArea === "group" ? t("overview.noGroupNotes") : t("overview.noNotes")}
          groupUsers={activeArea === "group" ? groupUsers : []}
          notes={filtered.notes}
          onCreateNote={() => void createNote()}
          onSelectNote={(noteId) => void selectNote(noteId)}
        />
      )}
    </div>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col gap-2 overflow-x-hidden p-2 sm:gap-3 sm:p-3 md:flex-row">
      {!sidebarOpen ? (
        <button
          className={cn(
            "icon-button fixed top-4 z-50 border-black/[0.08] bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/[0.09] dark:bg-navy-900/80",
            preferences.sidebarSide === "right" ? "right-4" : "left-4",
          )}
          type="button"
          title={t("sidebar.show")}
          aria-label={t("sidebar.show")}
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}
      {preferences.sidebarSide === "right" ? contentPanel : sidebarPanel}
      {preferences.sidebarSide === "right" ? sidebarPanel : contentPanel}
    </main>
  );
}

function toSummary(note: NoteDetailDto | NoteSummaryDto): NoteSummaryDto {
  return {
    id: note.id,
    scope: note.scope,
    folderId: note.folderId,
    title: note.title,
    pinned: note.pinned,
    alertAt: note.alertAt,
    calendarAt: note.calendarAt,
    excerpt: note.excerpt,
    checklistTotal: note.checklistTotal,
    checklistCompleted: note.checklistCompleted,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function FolderOverview({
  areaLabel,
  title,
  path,
  emptyText,
  groupUsers,
  notes,
  onCreateNote,
  onSelectNote,
}: {
  areaLabel: string;
  title: string;
  path: string;
  emptyText: string;
  groupUsers: AppUserDto[];
  notes: NoteSummaryDto[];
  onCreateNote: () => void;
  onSelectNote: (noteId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="glass-panel flex min-h-[28rem] flex-col rounded-2xl p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            <span>{areaLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>{path}</span>
          </div>
          <h2 className="truncate text-2xl font-semibold text-slate-950 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {groupUsers.length > 0 ? <GroupAudience users={groupUsers} /> : null}
          <Button type="button" variant="primary" onClick={onCreateNote}>
            <Plus className="h-4 w-4" />
            {t("overview.newNote")}
          </Button>
        </div>
      </header>

      {notes.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {notes.map((note) => (
            <FolderOverviewNote
              key={note.id}
              note={note}
              onSelectNote={onSelectNote}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 rounded-2xl border border-teal-500/10 bg-teal-500/10 p-4 text-teal-700 dark:text-teal-300">
            <NotebookPen className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

function CalendarView({
  notes,
  month,
  showGroupNotes,
  onMonthChange,
  onShowGroupNotesChange,
  onSelectNote,
}: {
  notes: NoteSummaryDto[];
  month: Date;
  showGroupNotes: boolean;
  onMonthChange: (month: Date) => void;
  onShowGroupNotesChange: (show: boolean) => void;
  onSelectNote: (note: NoteSummaryDto) => void;
}) {
  const { language, t } = useI18n();
  const entries = useMemo(() => buildCalendarEntries(notes), [notes]);
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();

    for (const entry of entries) {
      const key = dateKey(entry.date);
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }

    return grouped;
  }, [entries]);
  const upcoming = useMemo(
    () => entries.filter((entry) => endOfDay(entry.date) >= startOfDay(new Date())).slice(0, 10),
    [entries],
  );
  const mobileDays = useMemo(
    () => days.filter((day) => day.getMonth() === month.getMonth() || (entriesByDay.get(dateKey(day))?.length ?? 0) > 0),
    [days, entriesByDay, month],
  );

  return (
    <section className="glass-panel flex min-h-[calc(100dvh-1rem)] flex-col rounded-2xl p-3 sm:p-5">
      <header className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.08] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            Notka
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-950 dark:text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-500/15 bg-teal-500/10 text-teal-700 dark:text-teal-300">
              <CalendarDays className="h-5 w-5" />
            </span>
            {t("calendar.title")}
          </h1>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className={cn(
              "h-10 min-w-0 px-3 text-xs sm:text-sm",
              showGroupNotes &&
                "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-200",
            )}
            aria-pressed={showGroupNotes}
            onClick={() => onShowGroupNotesChange(!showGroupNotes)}
          >
            <Users className="h-4 w-4" />
            {t("calendar.showGroupNotes")}
          </Button>
          <Button
            type="button"
            title={t("calendar.previousMonth")}
            aria-label={t("calendar.previousMonth")}
            className="h-10 px-3"
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" className="h-10 px-3" onClick={() => onMonthChange(startOfMonth(new Date()))}>
            {t("calendar.today")}
          </Button>
          <Button
            type="button"
            title={t("calendar.nextMonth")}
            aria-label={t("calendar.nextMonth")}
            className="h-10 px-3"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/35 shadow-sm shadow-slate-950/[0.03] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              {formatMonth(month, language)}
            </h2>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              <CalendarLegend tone="green" label={t("calendar.ok")} />
              <CalendarLegend tone="yellow" label={t("calendar.soon")} />
              <CalendarLegend tone="red" label={t("calendar.due")} />
            </div>
          </div>
          <div className="block divide-y divide-black/[0.06] p-2 dark:divide-white/[0.07] md:hidden">
            {mobileDays.map((day) => {
              const key = dateKey(day);
              const dayEntries = entriesByDay.get(key) ?? [];
              const today = isSameDay(day, new Date());

              return (
                <div key={key} className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 py-3">
                  <div>
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300",
                        today && "bg-teal-500 text-white shadow-sm shadow-teal-500/25",
                      )}
                    >
                      {day.getDate()}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                      {formatWeekday(day, language)}
                    </div>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    {dayEntries.length > 0 ? (
                      dayEntries.map((entry) => (
                        <CalendarEventButton
                          key={entry.id}
                          entry={entry}
                          onSelectNote={onSelectNote}
                        />
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-black/[0.06] px-3 py-2 text-sm text-slate-400 dark:border-white/[0.07] dark:text-slate-500">
                        {t("calendar.noEntries")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block">
            <div className="min-w-[48rem]">
              <div className="grid grid-cols-7 border-b border-black/[0.06] dark:border-white/[0.08]">
                {getWeekdayLabels(language).map((day) => (
                  <div
                    key={day}
                    className="px-3 py-2 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const key = dateKey(day);
                  const dayEntries = entriesByDay.get(key) ?? [];
                  const muted = day.getMonth() !== month.getMonth();
                  const today = isSameDay(day, new Date());

                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-[7.75rem] border-b border-r border-black/[0.06] p-2 last:border-r-0 dark:border-white/[0.07]",
                        muted && "bg-white/20 text-slate-400 dark:bg-white/[0.018] dark:text-slate-600",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300",
                            today && "bg-teal-500 text-white shadow-sm shadow-teal-500/25",
                            muted && !today && "text-slate-400 dark:text-slate-600",
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <CalendarEventButton
                            key={entry.id}
                            entry={entry}
                            onSelectNote={onSelectNote}
                          />
                        ))}
                        {dayEntries.length > 3 ? (
                          <div className="px-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {t("calendar.more", { count: dayEntries.length - 3 })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="min-h-0 rounded-2xl border border-black/[0.08] bg-white/35 p-3 shadow-sm shadow-slate-950/[0.03] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/10">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-semibold uppercase text-slate-400 dark:text-slate-500">
              {t("calendar.upcoming")}
            </h2>
            <span className="notka-badge">{upcoming.length}</span>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((entry) => (
                <button
                  key={`upcoming-${entry.id}`}
                  className={cn(
                    "group w-full rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-px focus:outline-none focus:ring-4 focus:ring-teal-500/10",
                    calendarToneClass(entry.tone),
                  )}
                  type="button"
                  onClick={() => onSelectNote(entry.note)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {entry.note.title}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                      {entry.kind === "Alert" ? t("calendar.kindAlert") : t("calendar.kindNote")}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {formatEntryDate(entry.date, language)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-black/[0.06] px-3 py-3 text-sm text-slate-400 dark:border-white/[0.07] dark:text-slate-500">
              {t("calendar.noCalendarEntries")}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function CalendarLegend({ tone, label }: { tone: CalendarTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", calendarDotClass(tone))} />
      {label}
    </span>
  );
}

function CalendarEventButton({
  entry,
  onSelectNote,
}: {
  entry: CalendarEntry;
  onSelectNote: (note: NoteSummaryDto) => void;
}) {
  const { language, t } = useI18n();
  const kindLabel = entry.kind === "Alert" ? t("calendar.kindAlert") : t("calendar.kindNote");

  return (
    <button
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] leading-4 transition hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-teal-500/15",
        calendarToneClass(entry.tone),
      )}
      type="button"
      title={t("calendar.eventTitle", { kind: kindLabel, title: entry.note.title })}
      onClick={() => onSelectNote(entry.note)}
    >
      {entry.kind === "Alert" ? (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      ) : (
        <CalendarDays className="h-3 w-3 shrink-0" />
      )}
      <span className="shrink-0 font-semibold">{formatEntryTime(entry.date, language)}</span>
      <span className="min-w-0 truncate">{entry.note.title}</span>
    </button>
  );
}

function GroupAudience({ users }: { users: AppUserDto[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="muted-button h-10 px-3"
        type="button"
        title={t("group.peopleTitle")}
        aria-label={t("group.peopleLabel")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Users className="h-4 w-4" />
        <span className="hidden sm:inline">{t("group.visibleTo")}</span>
        <span className="notka-badge px-2 py-0.5 text-[11px]">{users.length}</span>
      </button>
      {open ? (
        <div className="settings-popover absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-2">
          <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            {t("group.access")}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200"
              >
                <div className="truncate font-semibold">{user.displayName}</div>
                <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                  {user.email}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FolderOverviewNote({
  note,
  onSelectNote,
}: {
  note: NoteSummaryDto;
  onSelectNote: (noteId: string) => void;
}) {
  const { language, t } = useI18n();
  const alertTone = getAlertTone(note.alertAt);
  const alertLabel = formatAlertDeadline(note.alertAt, language);

  return (
    <button
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border border-transparent bg-white/25 px-4 py-3 text-left transition hover:border-teal-500/20 hover:bg-white/45 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.065]",
        noteAlertClass(alertTone),
      )}
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-notka-note-id", note.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onSelectNote(note.id)}
    >
      {note.pinned ? <Pin className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-slate-950 dark:text-white">
            {note.title}
          </span>
          {alertTone !== "none" ? (
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                alertTone === "red" &&
                  "border-rose-400/25 bg-rose-500/15 text-rose-500 dark:text-rose-300",
                alertTone === "yellow" &&
                  "border-amber-400/25 bg-amber-500/15 text-amber-600 dark:text-amber-300",
                alertTone === "neon" &&
                  "border-teal-400/25 bg-teal-500/15 text-teal-700 dark:text-teal-300",
              )}
              title={
                alertLabel
                  ? t("editor.deadlineTitle", { date: alertLabel })
                  : t("editor.deadline")
              }
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {note.checklistTotal > 0 ? (
            <span className="ml-auto rounded-full border border-teal-500/10 bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
              {note.checklistCompleted}/{note.checklistTotal}
            </span>
          ) : null}
        </span>
        {note.excerpt ? (
          <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
            {note.excerpt}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function noteAlertClass(tone: AlertTone) {
  if (tone === "red") {
    return "border-rose-400/30 bg-rose-500/[0.08] shadow-[0_0_24px_rgba(244,63,94,0.18)] hover:border-rose-400/40 dark:bg-rose-500/[0.075]";
  }

  if (tone === "yellow") {
    return "border-amber-400/30 bg-amber-500/[0.08] shadow-[0_0_22px_rgba(245,158,11,0.16)] hover:border-amber-400/40 dark:bg-amber-500/[0.07]";
  }

  if (tone === "neon") {
    return "border-teal-400/30 bg-teal-500/[0.08] shadow-[0_0_22px_rgba(45,212,191,0.18)] hover:border-teal-400/40 dark:bg-teal-500/[0.07]";
  }

  return "";
}

type CalendarTone = "green" | "yellow" | "red";

type CalendarEntry = {
  id: string;
  kind: "Alert" | "Note";
  note: NoteSummaryDto;
  date: Date;
  tone: CalendarTone;
};

function buildCalendarEntries(notes: NoteSummaryDto[]) {
  const entries: CalendarEntry[] = [];

  for (const note of notes) {
    if (note.alertAt) {
      const date = parseDate(note.alertAt);

      if (date) {
        entries.push({
          id: `${note.id}-alert`,
          kind: "Alert",
          note,
          date,
          tone: alertCalendarTone(note.alertAt),
        });
      }
    }

    if (note.calendarAt) {
      const date = parseDate(note.calendarAt);

      if (date) {
        entries.push({
          id: `${note.id}-calendar`,
          kind: "Note",
          note,
          date,
          tone: "green",
        });
      }
    }
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function alertCalendarTone(alertAt: string): CalendarTone {
  const tone = getAlertTone(alertAt);

  if (tone === "red" || tone === "yellow") {
    return tone;
  }

  return "green";
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function formatMonth(value: Date, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatEntryTime(value: Date, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatEntryDate(value: Date, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatWeekday(value: Date, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    weekday: "short",
  }).format(value);
}

function getWeekdayLabels(language: Language) {
  const base = new Date(2024, 0, 1);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(base);
    day.setDate(base.getDate() + index);
    return formatWeekday(day, language);
  });
}

function calendarDotClass(tone: CalendarTone) {
  if (tone === "red") {
    return "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.45)]";
  }

  if (tone === "yellow") {
    return "bg-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.38)]";
  }

  return "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.35)]";
}

function calendarToneClass(tone: CalendarTone) {
  if (tone === "red") {
    return "border-rose-400/30 bg-rose-500/[0.12] text-rose-700 shadow-[0_0_18px_rgba(244,63,94,0.16)] hover:border-rose-400/45 dark:text-rose-200";
  }

  if (tone === "yellow") {
    return "border-amber-400/30 bg-amber-500/[0.12] text-amber-700 shadow-[0_0_18px_rgba(245,158,11,0.14)] hover:border-amber-400/45 dark:text-amber-200";
  }

  return "border-emerald-400/25 bg-emerald-500/[0.1] text-emerald-700 shadow-[0_0_18px_rgba(52,211,153,0.12)] hover:border-emerald-400/40 dark:text-emerald-200";
}

function sortFolders(a: FolderDto, b: FolderDto) {
  return (
    (a.parentFolderId ?? "").localeCompare(b.parentFolderId ?? "") ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name)
  );
}

function sortNotesByUpdated(a: NoteSummaryDto, b: NoteSummaryDto) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

function buildFolderPath(folders: FolderDto[], folderId: string | null, language: Language) {
  if (!folderId) {
    return "/";
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const segments: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    segments.unshift(translateFolderName(language, current.name));
    current = current.parentFolderId ? byId.get(current.parentFolderId) : undefined;
  }

  return `/${segments.join("/")}`;
}

function folderStorageKey(scope: NoteScope) {
  return scope === "group" ? "notka-folder-id-group" : "notka-folder-id-personal";
}

function getDefaultFolderId(folders: FolderDto[], scope: NoteScope, fallbackPersonalFolderId: string) {
  if (scope === "personal") {
    return folders.some((folder) => folder.id === fallbackPersonalFolderId)
      ? fallbackPersonalFolderId
      : folders[0]?.id ?? null;
  }

  return folders.find((folder) => folder.name === "Group Inbox" && !folder.parentFolderId)?.id
    ?? folders[0]?.id
    ?? null;
}
