"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  NotebookPen,
  PanelLeftOpen,
  Pin,
  Plus,
  Repeat,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
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
  AlertNoteEditMode,
  AlertNoteOccurrenceDto,
  AlertNoteRecurrence,
  AppUserDto,
  AuthUser,
  FolderDto,
  NoteDetailDto,
  NoteScope,
  NoteSummaryDto,
  TemplateDto,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type AppArea = "personal" | "group" | "calendar" | "alertNotes";
type DropPosition = "before" | "after";
type AlertNoteMutationInput = {
  text: string;
  scheduledAt: string;
  timezone: string;
  recurrence: AlertNoteRecurrence;
  recurrenceEndAt: string | null;
};
type AlertNoteUpdateInput = AlertNoteMutationInput & {
  occurrenceAt: string;
  mode: AlertNoteEditMode;
};
type AlertNoteDeleteInput = {
  occurrenceAt: string;
  mode: AlertNoteEditMode;
};
type AlertNoteFormState = {
  text: string;
  scheduledAt: string;
  recurrence: AlertNoteRecurrence;
  recurrenceEndAt: string;
  mode: AlertNoteEditMode;
};

type SidebarSwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  sidebarOpenAtStart: boolean;
  sidebarSide: UserPreferences["sidebarSide"];
};

const MOBILE_SIDEBAR_SWIPE_EDGE_PX = 72;
const MOBILE_SIDEBAR_SWIPE_DISTANCE_PX = 56;
const MOBILE_SIDEBAR_SWIPE_RATIO = 1.25;
const appSafeAreaStyle: CSSProperties = {
  paddingTop: "max(1.75rem, calc(env(safe-area-inset-top) + 1.75rem))",
  paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
};
const mobileSidebarPanelStyle: CSSProperties = {
  top: "max(1.75rem, calc(env(safe-area-inset-top) + 1.75rem))",
  bottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
};
const floatingMenuButtonStyle: CSSProperties = {
  bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 1rem))",
};

type NotkaAppProps = {
  user: AuthUser;
  initialFolders: FolderDto[];
  initialNotes: NoteSummaryDto[];
  initialTemplates: TemplateDto[];
  defaultFolderId: string | null;
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
  const [trashNotes, setTrashNotes] = useState<NoteSummaryDto[]>([]);
  const [templates, setTemplates] = useState(initialTemplates);
  const [groupUsers, setGroupUsers] = useState<AppUserDto[]>([]);
  const [calendarNotes, setCalendarNotes] = useState<NoteSummaryDto[]>([]);
  const [alertNotes, setAlertNotes] = useState<AlertNoteOccurrenceDto[]>([]);
  const [calendarAlertNotes, setCalendarAlertNotes] = useState<AlertNoteOccurrenceDto[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [showGroupCalendarNotes, setShowGroupCalendarNotes] = useState(false);
  const [activeArea, setActiveArea] = useState<AppArea>("personal");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolderId);
  const [selectedNote, setSelectedNote] = useState<NoteDetailDto | null>(null);
  const [selectedTrash, setSelectedTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [alertNow, setAlertNow] = useState(() => new Date());
  const [areaReady, setAreaReady] = useState(false);
  const [editorHasUnsavedChanges, setEditorHasUnsavedChanges] = useState(false);
  const listRequestIdRef = useRef(0);
  const noteRequestIdRef = useRef(0);
  const sidebarSwipeRef = useRef<SidebarSwipeGesture | null>(null);
  const currentScope: NoteScope = activeArea === "group" ? "group" : "personal";

  const refreshTrashNotes = useCallback(async (scope: NoteScope = currentScope) => {
    const response = await fetch(`/api/notes?scope=${scope}&trash=true`);

    if (response.ok) {
      const body = await response.json();
      setTrashNotes(body.notes as NoteSummaryDto[]);
    }
  }, [currentScope]);

  const refreshFoldersAndNotes = useCallback(async (scope: NoteScope = currentScope) => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    const [foldersResponse, notesResponse, trashResponse] = await Promise.all([
      fetch(`/api/folders?scope=${scope}`),
      fetch(`/api/notes?scope=${scope}`),
      fetch(`/api/notes?scope=${scope}&trash=true`),
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

    if (trashResponse.ok) {
      const body = await trashResponse.json();
      setTrashNotes(body.notes as NoteSummaryDto[]);
    }
  }, [currentScope]);

  const refreshCalendarNotes = useCallback(async () => {
    const days = buildCalendarDays(calendarMonth);
    const params = new URLSearchParams({
      from: startOfDay(days[0]).toISOString(),
      to: endOfDay(days[days.length - 1]).toISOString(),
    });

    if (showGroupCalendarNotes) {
      params.set("includeGroup", "true");
    }

    const response = await fetch(`/api/calendar?${params.toString()}`);

    if (response.ok) {
      const body = await response.json();
      setCalendarNotes(body.notes as NoteSummaryDto[]);
      setCalendarAlertNotes((body.alertNotes ?? []) as AlertNoteOccurrenceDto[]);
    }
  }, [calendarMonth, showGroupCalendarNotes]);

  const refreshAlertNotes = useCallback(async () => {
    const now = new Date();
    const from = addDays(startOfDay(now), -7);
    const to = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), 23, 59, 59, 999);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      limit: "80",
    });
    const response = await fetch(`/api/alert-notes?${params.toString()}`);

    if (response.ok) {
      const body = await response.json();
      setAlertNotes((body.alertNotes ?? []) as AlertNoteOccurrenceDto[]);
    }
  }, []);

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

    if (storedArea === "group" || storedArea === "calendar" || storedArea === "alertNotes") {
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
    if (!areaReady) {
      return;
    }

    void refreshAlertNotes();
  }, [areaReady, activeArea, refreshAlertNotes]);

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
      sidebarNotes: notes.filter(matchesSearch).sort(sortNotesByImportance),
      trashNotes: trashNotes.filter(matchesSearch).sort(sortTrashNotes),
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
        .sort(sortNotesByImportance),
    };
  }, [notes, search, selectedFolderId, trashNotes]);
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
  const visibleCalendarAlertNotes = calendarAlertNotes;

  function selectFolder(folderId: string) {
    noteRequestIdRef.current += 1;
    setActiveArea(currentScope === "group" ? "group" : "personal");
    setSelectedTrash(false);
    setSelectedFolderId(folderId);
    setSelectedNote(null);
    setLoadingNoteId(null);
    setEditorHasUnsavedChanges(false);
    localStorage.setItem(folderStorageKey(currentScope), folderId);
    localStorage.setItem("notka-area", currentScope === "group" ? "group" : "personal");
    closeSidebarOnMobile();
  }

  function selectAllNotes() {
    noteRequestIdRef.current += 1;
    setActiveArea(currentScope === "group" ? "group" : "personal");
    setSelectedTrash(false);
    setSelectedFolderId(null);
    setSelectedNote(null);
    setLoadingNoteId(null);
    setEditorHasUnsavedChanges(false);
    localStorage.setItem(folderStorageKey(currentScope), "all");
    localStorage.setItem("notka-area", currentScope === "group" ? "group" : "personal");
    closeSidebarOnMobile();
  }

  function selectTrash() {
    noteRequestIdRef.current += 1;
    setActiveArea(currentScope === "group" ? "group" : "personal");
    setSelectedTrash(true);
    setSelectedFolderId(null);
    setSelectedNote(null);
    setLoadingNoteId(null);
    setEditorHasUnsavedChanges(false);
    localStorage.setItem("notka-area", currentScope === "group" ? "group" : "personal");
    closeSidebarOnMobile();
  }

  async function selectNote(noteId: string) {
    await selectNoteByScope(noteId, currentScope, false);
  }

  async function selectTrashNote(noteId: string) {
    await selectNoteByScope(noteId, currentScope, true);
  }

  async function selectNoteByScope(noteId: string, scope: NoteScope, trash = false) {
    const requestId = noteRequestIdRef.current + 1;
    noteRequestIdRef.current = requestId;
    setLoadingNoteId(noteId);
    const response = await fetch(`/api/notes/${noteId}?scope=${scope}${trash ? "&trash=true" : ""}`);
    const body = await response.json().catch(() => ({}));

    if (noteRequestIdRef.current !== requestId) {
      return;
    }

    setLoadingNoteId(null);

    if (response.ok) {
      setSelectedNote(body.note as NoteDetailDto);
      setSelectedTrash(trash);
      setActiveArea(scope === "group" ? "group" : "personal");
      localStorage.setItem("notka-area", scope === "group" ? "group" : "personal");
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
    setTrashNotes([]);
    setSelectedNote(null);
    setSelectedTrash(false);
    setSelectedFolderId(note.folderId);
    setSearch("");
    setEditorHasUnsavedChanges(false);
    localStorage.setItem("notka-area", nextArea);

    if (note.folderId) {
      localStorage.setItem(folderStorageKey(note.scope), note.folderId);
    }

    await refreshFoldersAndNotes(note.scope);
    await selectNoteByScope(note.id, note.scope, false);
  }

  async function createNote(templateId?: string, targetFolderId: string | null = selectedFolderId) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: targetFolderId,
        templateId,
        scope: currentScope,
        language,
      }),
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      const note = body.note as NoteDetailDto;
      setSelectedTrash(false);
      upsertNote(note);
      setSelectedNote(note);
      closeSidebarOnMobile();
    }
  }

  async function createAlertNote(input: AlertNoteMutationInput) {
    const response = await fetch("/api/alert-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : "Could not save alert note.";
      window.alert(message);
      throw new Error(message);
    }

    await refreshAlertNotes();

    if (activeArea === "calendar") {
      await refreshCalendarNotes();
    }
  }

  async function updateAlertNote(alertNoteId: string, input: AlertNoteUpdateInput) {
    const response = await fetch(`/api/alert-notes/${alertNoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : "Could not save alert note.";
      window.alert(message);
      throw new Error(message);
    }

    await refreshAlertNotes();

    if (activeArea === "calendar") {
      await refreshCalendarNotes();
    }
  }

  async function deleteAlertNote(alertNoteId: string, input: AlertNoteDeleteInput) {
    const response = await fetch(`/api/alert-notes/${alertNoteId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : "Could not delete alert note.";
      window.alert(message);
      throw new Error(message);
    }

    await refreshAlertNotes();

    if (activeArea === "calendar") {
      await refreshCalendarNotes();
    }
  }

  async function createFolder(name: string, parentFolderId?: string | null) {
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parentFolderId:
          parentFolderId !== undefined
            ? parentFolderId
            : selectedFolderId,
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

  async function moveNoteToFolder(noteId: string, folderId: string | null) {
    const sortOrder = getNextNoteSortOrder(notes, folderId, noteId);
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, sortOrder, scope: currentScope }),
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

  async function reorderNote(
    noteId: string,
    targetFolderId: string | null,
    targetNoteId: string,
    position: DropPosition,
  ) {
    const nextNotes = reorderNotes(notes, noteId, targetFolderId, targetNoteId, position);

    if (!nextNotes) {
      return;
    }

    const changedNotes = nextNotes.filter((next) => {
      const current = notes.find((note) => note.id === next.id);
      return current && (current.folderId !== next.folderId || current.sortOrder !== next.sortOrder);
    });

    if (changedNotes.length === 0) {
      return;
    }

    setNotes(nextNotes.sort(sortNotesByImportance));

    if (selectedNote && changedNotes.some((note) => note.id === selectedNote.id)) {
      const updatedSelected = nextNotes.find((note) => note.id === selectedNote.id);

      if (updatedSelected) {
        setSelectedNote({ ...selectedNote, ...updatedSelected });
      }
    }

    try {
      const responses = await Promise.all(
        changedNotes.map((note) =>
          fetch(`/api/notes/${note.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderId: note.folderId,
              sortOrder: note.sortOrder,
              scope: currentScope,
            }),
          }),
        ),
      );

      if (responses.every((response) => response.ok)) {
        return;
      }

      await refreshFoldersAndNotes(currentScope);
    } catch {
      await refreshFoldersAndNotes(currentScope);
    }
  }

  async function deleteFolder(folderId: string) {
    const response = await fetch(`/api/folders/${folderId}?moveToRoot=true&scope=${currentScope}`, {
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

      return next.sort(sortNotesByImportance);
    });

    if (summary.alertAt || summary.calendarAt) {
      setCalendarNotes((current) => {
        const exists = current.some((entry) => entry.id === summary.id);
        const next = exists
          ? current.map((entry) => (entry.id === summary.id ? summary : entry))
          : [summary, ...current];

        return next.sort(sortNotesByImportance);
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
    if (selectedTrash) {
      setTrashNotes((current) => current.filter((note) => note.id !== noteId));
    } else {
      setNotes((current) => current.filter((note) => note.id !== noteId));
      void refreshTrashNotes(currentScope);
    }
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

    if (nextArea === "alertNotes") {
      setActiveArea(nextArea);
      noteRequestIdRef.current += 1;
      setSelectedNote(null);
      setSelectedTrash(false);
      setLoadingNoteId(null);
      setEditorHasUnsavedChanges(false);
      localStorage.setItem("notka-area", nextArea);
      return;
    }

    setActiveArea(nextArea);
    listRequestIdRef.current += 1;
    noteRequestIdRef.current += 1;
    setFolders([]);
    setNotes([]);
    setTrashNotes([]);
    setSelectedNote(null);
    setSelectedTrash(false);
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

  function handleAppPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch" || !isMobileViewport() || isEditableSwipeTarget(event.target)) {
      sidebarSwipeRef.current = null;
      return;
    }

    const startX = event.clientX;
    const viewportWidth = window.innerWidth;
    const startsNearOpeningEdge =
      preferences.sidebarSide === "right"
        ? viewportWidth - startX <= MOBILE_SIDEBAR_SWIPE_EDGE_PX
        : startX <= MOBILE_SIDEBAR_SWIPE_EDGE_PX;

    if (!sidebarOpen && !startsNearOpeningEdge) {
      sidebarSwipeRef.current = null;
      return;
    }

    sidebarSwipeRef.current = {
      pointerId: event.pointerId,
      startX,
      startY: event.clientY,
      sidebarOpenAtStart: sidebarOpen,
      sidebarSide: preferences.sidebarSide,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
  }

  function handleAppPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const gesture = sidebarSwipeRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absY > 24 && absY > absX) {
      sidebarSwipeRef.current = null;
      return;
    }

    if (absX < MOBILE_SIDEBAR_SWIPE_DISTANCE_PX || absX < absY * MOBILE_SIDEBAR_SWIPE_RATIO) {
      return;
    }

    const swipedTowardOpenSide =
      gesture.sidebarSide === "right" ? dx < 0 : dx > 0;
    const shouldOpen = !gesture.sidebarOpenAtStart && swipedTowardOpenSide;
    const shouldClose = gesture.sidebarOpenAtStart && !swipedTowardOpenSide;

    if (shouldOpen) {
      setSidebarOpen(true);
    } else if (shouldClose) {
      setSidebarOpen(false);
    }

    sidebarSwipeRef.current = null;
  }

  function endAppPointerGesture(event: ReactPointerEvent<HTMLElement>) {
    if (sidebarSwipeRef.current?.pointerId === event.pointerId) {
      sidebarSwipeRef.current = null;
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
          "fixed z-40 w-[min(21rem,calc(100vw-1rem))] md:static md:z-auto md:w-80 md:flex-none",
          preferences.sidebarSide === "right" ? "right-3" : "left-3",
        )}
        style={mobileSidebarPanelStyle}
      >
        <Sidebar
          user={user}
          activeArea={activeArea}
          folders={folders}
          alertShortcutNote={alertShortcutNote}
          alertNotes={alertNotes}
          pinnedNotes={filtered.pinnedNotes}
          trashNotes={filtered.trashNotes}
          selectedFolderId={selectedTrash ? null : selectedFolderId}
          selectedNoteId={selectedNote?.id ?? loadingNoteId}
          selectedTrash={selectedTrash}
          notes={filtered.sidebarNotes}
          search={search}
          onSearchChange={setSearch}
          onAreaChange={changeArea}
          onSelectFolder={selectFolder}
          onSelectAllNotes={selectAllNotes}
          onSelectTrash={selectTrash}
          onSelectNote={selectNote}
          onSelectTrashNote={selectTrashNote}
          onCreateNoteInFolder={(folderId) => void createNote(undefined, folderId)}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onMoveFolder={moveFolder}
          onMoveNoteToFolder={moveNoteToFolder}
          onReorderNote={reorderNote}
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
          alertNotes={visibleCalendarAlertNotes}
          month={calendarMonth}
          showGroupNotes={showGroupCalendarNotes}
          onMonthChange={setCalendarMonth}
          onShowGroupNotesChange={setShowGroupCalendarNotes}
          onSelectNote={(note) => void selectCalendarNote(note)}
        />
      ) : activeArea === "alertNotes" ? (
        <AlertNotesView
          alertNotes={alertNotes}
          onCreateAlertNote={createAlertNote}
          onUpdateAlertNote={updateAlertNote}
          onDeleteAlertNote={deleteAlertNote}
        />
      ) : selectedNote ? (
        <NoteEditor
          key={selectedNote.id}
          note={selectedNote}
          scope={currentScope}
          folderPath={selectedTrash ? `/${t("sidebar.trash")}` : buildFolderPath(folders, selectedNote.folderId, language)}
          templates={templates}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCreateTemplate={createTemplate}
          onCreateFromTemplate={(templateId) => void createNote(templateId)}
          onDirtyChange={setEditorHasUnsavedChanges}
          isTrash={selectedTrash}
        />
      ) : selectedTrash ? (
        <FolderOverview
          areaLabel={activeArea === "group" ? t("nav.groupNotes") : t("nav.personalNotes")}
          title={t("sidebar.trash")}
          path={`/${t("sidebar.trash")}`}
          emptyText={t("overview.noTrashNotes")}
          groupUsers={[]}
          notes={filtered.trashNotes}
          onSelectNote={(noteId) => void selectTrashNote(noteId)}
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
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[1600px] touch-pan-y flex-col gap-2 overflow-x-hidden p-2 sm:gap-3 sm:p-3 md:flex-row"
      style={appSafeAreaStyle}
      onPointerDown={handleAppPointerDown}
      onPointerMove={handleAppPointerMove}
      onPointerUp={endAppPointerGesture}
      onPointerCancel={endAppPointerGesture}
    >
      {!sidebarOpen ? (
        <button
          className="fixed right-4 z-50 inline-flex h-12 items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/85 px-3.5 pr-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-px hover:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/15 active:translate-y-0 dark:border-white/[0.09] dark:bg-navy-900/85 dark:text-slate-100 dark:hover:bg-navy-850"
          style={floatingMenuButtonStyle}
          type="button"
          title={t("sidebar.show")}
          aria-label={t("sidebar.show")}
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="h-5 w-5" />
          <span>{t("sidebar.menu")}</span>
        </button>
      ) : null}
      {preferences.sidebarSide === "right" ? contentPanel : sidebarPanel}
      {preferences.sidebarSide === "right" ? sidebarPanel : contentPanel}
    </main>
  );
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function isEditableSwipeTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function toSummary(note: NoteDetailDto | NoteSummaryDto): NoteSummaryDto {
  return {
    id: note.id,
    scope: note.scope,
    folderId: note.folderId,
    title: note.title,
    pinned: note.pinned,
    sortOrder: note.sortOrder,
    alertAt: note.alertAt,
    calendarAt: note.calendarAt,
    deletedAt: note.deletedAt,
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
  onCreateNote?: () => void;
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
          {onCreateNote ? (
            <Button type="button" variant="primary" onClick={onCreateNote}>
              <Plus className="h-4 w-4" />
              {t("overview.newNote")}
            </Button>
          ) : null}
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

function AlertNotesView({
  alertNotes,
  onCreateAlertNote,
  onUpdateAlertNote,
  onDeleteAlertNote,
}: {
  alertNotes: AlertNoteOccurrenceDto[];
  onCreateAlertNote: (input: AlertNoteMutationInput) => Promise<void>;
  onUpdateAlertNote: (alertNoteId: string, input: AlertNoteUpdateInput) => Promise<void>;
  onDeleteAlertNote: (alertNoteId: string, input: AlertNoteDeleteInput) => Promise<void>;
}) {
  const { language, t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlertNoteFormState>(() => newAlertNoteFormState());
  const [saving, setSaving] = useState(false);
  const editingAlertNote = alertNotes.find((alertNote) => alertNote.id === editingId) ?? null;

  function beginCreate() {
    setEditingId(null);
    setForm(newAlertNoteFormState());
  }

  function beginEdit(alertNote: AlertNoteOccurrenceDto) {
    setEditingId(alertNote.id);
    setForm(alertNoteFormStateFromOccurrence(alertNote));
  }

  async function submitAlertNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = alertNotePayloadFromForm(form);

    if (!payload) {
      return;
    }

    setSaving(true);

    try {
      if (editingAlertNote) {
        await onUpdateAlertNote(editingAlertNote.alertNoteId, {
          ...payload,
          occurrenceAt: editingAlertNote.occurrenceAt,
          mode: editingAlertNote.recurring ? form.mode : "all",
        });
      } else {
        await onCreateAlertNote(payload);
      }

      beginCreate();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentAlertNote() {
    if (!editingAlertNote || !window.confirm(t("alertNotes.deleteConfirm"))) {
      return;
    }

    setSaving(true);

    try {
      await onDeleteAlertNote(editingAlertNote.alertNoteId, {
        occurrenceAt: editingAlertNote.occurrenceAt,
        mode: editingAlertNote.recurring ? form.mode : "all",
      });
      beginCreate();
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-panel flex min-h-[calc(100dvh-1rem)] flex-col rounded-2xl p-3 sm:p-5">
      <header className="flex flex-col gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.08] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            Notka
          </div>
          <h1 className="flex min-w-0 items-center gap-3 text-2xl font-semibold text-slate-950 dark:text-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-teal-500/15 bg-teal-500/10 text-teal-700 dark:text-teal-300">
              <CheckSquare className="h-5 w-5" />
            </span>
            <span className="truncate">{t("alertNotes.title")}</span>
          </h1>
        </div>
        <Button type="button" variant="primary" onClick={beginCreate}>
          <Plus className="h-4 w-4" />
          {t("alertNotes.new")}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/35 shadow-sm shadow-slate-950/[0.03] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/10">
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
            <h2 className="text-sm font-semibold uppercase text-slate-400 dark:text-slate-500">
              {t("alertNotes.entries")}
            </h2>
            <span className="notka-badge">{alertNotes.length}</span>
          </div>
          {alertNotes.length > 0 ? (
            <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto p-2">
              {alertNotes.map((alertNote) => (
                <button
                  key={alertNote.id}
                  className={cn(
                    "group mb-2 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition hover:-translate-y-px focus:outline-none focus:ring-4 focus:ring-teal-500/10",
                    editingId === alertNote.id
                      ? "border-teal-400/35 bg-teal-500/[0.12] shadow-sm shadow-teal-500/10 dark:bg-teal-500/[0.1]"
                      : "border-black/[0.06] bg-white/30 hover:border-teal-500/20 hover:bg-white/50 dark:border-white/[0.07] dark:bg-white/[0.035] dark:hover:bg-white/[0.065]",
                  )}
                  type="button"
                  onClick={() => beginEdit(alertNote)}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300">
                    <CheckSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {alertNote.text}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatEntryDate(new Date(alertNote.scheduledAt), language)}
                      </span>
                      {alertNote.recurring ? (
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="h-3.5 w-3.5" />
                          {recurrenceLabel(alertNote.recurrence, t)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[18rem] flex-col items-center justify-center px-5 py-10 text-center">
              <div className="mb-4 rounded-2xl border border-teal-500/10 bg-teal-500/10 p-4 text-teal-700 dark:text-teal-300">
                <CheckSquare className="h-8 w-8" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("alertNotes.noAlertNotes")}
              </p>
            </div>
          )}
        </div>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/35 p-3 shadow-sm shadow-slate-950/[0.03] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-black/10">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="truncate text-sm font-semibold uppercase text-slate-400 dark:text-slate-500">
              {editingAlertNote ? t("alertNotes.editPanel") : t("alertNotes.new")}
            </h2>
            {editingAlertNote ? (
              <button
                className="icon-button h-8 w-8"
                type="button"
                title={t("alertNotes.cancel")}
                aria-label={t("alertNotes.cancel")}
                onClick={beginCreate}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <form className="grid gap-3" onSubmit={submitAlertNote}>
            <label className="grid min-w-0 gap-1.5">
              <span className="px-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                {t("alertNotes.text")}
              </span>
              <input
                className="notka-input"
                value={form.text}
                maxLength={280}
                onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                placeholder={t("alertNotes.textPlaceholder")}
              />
            </label>
            <label className="grid min-w-0 gap-1.5">
              <span className="px-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                {t("alertNotes.dateTime")}
              </span>
              <input
                className="notka-input"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
              />
            </label>
            <div className="grid min-w-0 gap-3">
              <label className="grid min-w-0 gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  {t("alertNotes.recurrence")}
                </span>
                <select
                  className="notka-input h-10 py-0"
                  value={form.recurrence}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recurrence: event.target.value as AlertNoteRecurrence,
                    }))
                  }
                >
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="none">
                    {t("alertNotes.recurrenceNone")}
                  </option>
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="daily">
                    {t("alertNotes.recurrenceDaily")}
                  </option>
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="weekly">
                    {t("alertNotes.recurrenceWeekly")}
                  </option>
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="monthly">
                    {t("alertNotes.recurrenceMonthly")}
                  </option>
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="yearly">
                    {t("alertNotes.recurrenceYearly")}
                  </option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  {t("alertNotes.ends")}
                </span>
                <input
                  className="notka-input"
                  type="datetime-local"
                  disabled={form.recurrence === "none"}
                  value={form.recurrence === "none" ? "" : form.recurrenceEndAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, recurrenceEndAt: event.target.value }))
                  }
                />
              </label>
            </div>
            {editingAlertNote?.recurring ? (
              <label className="grid min-w-0 gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  {t("alertNotes.editScope")}
                </span>
                <select
                  className="notka-input h-10 py-0"
                  value={form.mode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mode: event.target.value as AlertNoteEditMode,
                    }))
                  }
                >
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="current">
                    {t("alertNotes.thisOccurrence")}
                  </option>
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="future">
                    {t("alertNotes.futureOccurrences")}
                  </option>
                  <option className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100" value="all">
                    {t("alertNotes.allOccurrences")}
                  </option>
                </select>
              </label>
            ) : null}
            <div className="grid min-w-0 gap-2 pt-1">
              <Button type="submit" variant="primary" className="w-full" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? t("alertNotes.saving") : t("alertNotes.save")}
              </Button>
              {editingAlertNote ? (
                <Button
                  type="button"
                  className="w-full text-rose-600 dark:text-rose-300"
                  disabled={saving}
                  onClick={() => void deleteCurrentAlertNote()}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("alertNotes.delete")}
                </Button>
              ) : null}
            </div>
          </form>
        </aside>
      </div>
    </section>
  );
}

function newAlertNoteFormState(): AlertNoteFormState {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);

  return {
    text: "",
    scheduledAt: toDatetimeLocalValue(next.toISOString()),
    recurrence: "none",
    recurrenceEndAt: "",
    mode: "current",
  };
}

function alertNoteFormStateFromOccurrence(alertNote: AlertNoteOccurrenceDto): AlertNoteFormState {
  return {
    text: alertNote.text,
    scheduledAt: toDatetimeLocalValue(alertNote.scheduledAt),
    recurrence: alertNote.recurrence,
    recurrenceEndAt: alertNote.recurrenceEndAt ? toDatetimeLocalValue(alertNote.recurrenceEndAt) : "",
    mode: "current",
  };
}

function alertNotePayloadFromForm(form: AlertNoteFormState): AlertNoteMutationInput | null {
  const scheduledAt = dateTimeLocalToIso(form.scheduledAt);
  const recurrenceEndAt =
    form.recurrence === "none" || !form.recurrenceEndAt
      ? null
      : dateTimeLocalToIso(form.recurrenceEndAt);

  if (!scheduledAt || (form.recurrence !== "none" && form.recurrenceEndAt && !recurrenceEndAt)) {
    return null;
  }

  return {
    text: form.text,
    scheduledAt,
    timezone: localTimezone(),
    recurrence: form.recurrence,
    recurrenceEndAt,
  };
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function localTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function recurrenceLabel(
  recurrence: AlertNoteRecurrence,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (recurrence === "daily") {
    return t("alertNotes.recurrenceDaily");
  }

  if (recurrence === "weekly") {
    return t("alertNotes.recurrenceWeekly");
  }

  if (recurrence === "monthly") {
    return t("alertNotes.recurrenceMonthly");
  }

  if (recurrence === "yearly") {
    return t("alertNotes.recurrenceYearly");
  }

  return t("alertNotes.recurrenceNone");
}

function CalendarView({
  notes,
  alertNotes,
  month,
  showGroupNotes,
  onMonthChange,
  onShowGroupNotesChange,
  onSelectNote,
}: {
  notes: NoteSummaryDto[];
  alertNotes: AlertNoteOccurrenceDto[];
  month: Date;
  showGroupNotes: boolean;
  onMonthChange: (month: Date) => void;
  onShowGroupNotesChange: (show: boolean) => void;
  onSelectNote: (note: NoteSummaryDto) => void;
}) {
  const { language, t } = useI18n();
  const entries = useMemo(() => buildCalendarEntries(notes, alertNotes), [alertNotes, notes]);
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
                  onClick={() => {
                    if (entry.source === "note") {
                      onSelectNote(entry.note);
                    }
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {calendarEntryTitle(entry)}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                      {calendarEntryKindLabel(entry, t)}
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
  const kindLabel = calendarEntryKindLabel(entry, t);

  return (
    <button
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] leading-4 transition hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-teal-500/15",
        calendarToneClass(entry.tone),
      )}
      type="button"
      title={t("calendar.eventTitle", { kind: kindLabel, title: calendarEntryTitle(entry) })}
      onClick={() => {
        if (entry.source === "note") {
          onSelectNote(entry.note);
        }
      }}
    >
      {entry.source === "alertNote" ? (
        <CheckSquare className="h-3 w-3 shrink-0" />
      ) : entry.kind === "Alert" ? (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      ) : (
        <CalendarDays className="h-3 w-3 shrink-0" />
      )}
      <span className="shrink-0 font-semibold">{formatEntryTime(entry.date, language)}</span>
      <span className="min-w-0 truncate">{calendarEntryTitle(entry)}</span>
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
          <PopoverCloseButton label={t("menu.hide")} onClick={() => setOpen(false)} />
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
        note.pinned && pinnedNoteClass(),
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

function pinnedNoteClass() {
  return "border-amber-400/35 bg-amber-300/20 text-amber-950 shadow-sm shadow-amber-500/10 hover:border-amber-400/45 hover:bg-amber-300/28 dark:border-amber-300/20 dark:bg-amber-400/[0.13] dark:text-amber-100 dark:hover:bg-amber-400/[0.18]";
}

function PopoverCloseButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white/50 px-3 py-2 text-xs font-semibold uppercase text-slate-500 transition hover:bg-white/80 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/15 dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.09] dark:hover:text-white"
      type="button"
      onClick={onClick}
    >
      <ChevronUp className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

type CalendarTone = "green" | "yellow" | "red";

type CalendarNoteEntry = {
  id: string;
  source: "note";
  kind: "Alert" | "Note";
  note: NoteSummaryDto;
  date: Date;
  tone: CalendarTone;
};

type CalendarAlertNoteEntry = {
  id: string;
  source: "alertNote";
  kind: "AlertNote";
  alertNote: AlertNoteOccurrenceDto;
  date: Date;
  tone: CalendarTone;
};

type CalendarEntry = CalendarNoteEntry | CalendarAlertNoteEntry;

function buildCalendarEntries(notes: NoteSummaryDto[], alertNotes: AlertNoteOccurrenceDto[]) {
  const entries: CalendarEntry[] = [];

  for (const note of notes) {
    if (note.alertAt) {
      const date = parseDate(note.alertAt);

      if (date) {
        entries.push({
          id: `${note.id}-alert`,
          source: "note",
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
          source: "note",
          kind: "Note",
          note,
          date,
          tone: "green",
        });
      }
    }
  }

  for (const alertNote of alertNotes) {
    const date = parseDate(alertNote.scheduledAt);

    if (date) {
      entries.push({
        id: `alert-note-${alertNote.id}`,
        source: "alertNote",
        kind: "AlertNote",
        alertNote,
        date,
        tone: "green",
      });
    }
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function calendarEntryTitle(entry: CalendarEntry) {
  return entry.source === "note" ? entry.note.title : entry.alertNote.text;
}

function calendarEntryKindLabel(
  entry: CalendarEntry,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (entry.source === "alertNote") {
    return t("calendar.kindAlertNote");
  }

  return entry.kind === "Alert" ? t("calendar.kindAlert") : t("calendar.kindNote");
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

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
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

function sortNotesByImportance(a: NoteSummaryDto, b: NoteSummaryDto) {
  return (
    Number(b.pinned) - Number(a.pinned) ||
    a.sortOrder - b.sortOrder ||
    b.updatedAt.localeCompare(a.updatedAt) ||
    a.title.localeCompare(b.title)
  );
}

function sortTrashNotes(a: NoteSummaryDto, b: NoteSummaryDto) {
  return (
    (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "") ||
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

function getNextNoteSortOrder(
  notes: NoteSummaryDto[],
  folderId: string | null,
  excludeNoteId?: string,
) {
  return (
    notes
      .filter((note) => note.id !== excludeNoteId && (note.folderId ?? null) === folderId)
      .reduce((max, note) => Math.max(max, note.sortOrder), 0) + 10
  );
}

function reorderNotes(
  notes: NoteSummaryDto[],
  noteId: string,
  targetFolderId: string | null,
  targetNoteId: string,
  position: DropPosition,
) {
  const dragged = notes.find((note) => note.id === noteId);

  if (!dragged) {
    return null;
  }

  const siblings = notes
    .filter((note) => note.id !== noteId && (note.folderId ?? null) === targetFolderId)
    .sort(sortNotesByImportance);
  const targetIndex = siblings.findIndex((note) => note.id === targetNoteId);

  if (targetIndex < 0) {
    return null;
  }

  const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
  const orderedSiblings = [...siblings];
  orderedSiblings.splice(insertIndex, 0, { ...dragged, folderId: targetFolderId });

  const orderUpdates = new Map(
    orderedSiblings.map((note, index) => [
      note.id,
      {
        folderId: targetFolderId,
        sortOrder: (index + 1) * 10,
      },
    ]),
  );

  return notes.map((note) => {
    const update = orderUpdates.get(note.id);
    return update ? { ...note, ...update } : note;
  });
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

function getDefaultFolderId(folders: FolderDto[], scope: NoteScope, fallbackPersonalFolderId: string | null) {
  if (scope === "personal") {
    return fallbackPersonalFolderId && folders.some((folder) => folder.id === fallbackPersonalFolderId)
      ? fallbackPersonalFolderId
      : null;
  }

  return folders.find((folder) => folder.name === "Group Inbox" && !folder.parentFolderId)?.id
    ?? folders[0]?.id
    ?? null;
}
