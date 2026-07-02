"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  LogOut,
  Pencil,
  PanelLeftClose,
  Pin,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { DragEvent, FormEvent, useMemo, useState } from "react";

import { languages, useI18n } from "@/components/i18n-provider";
import { formatAlertDeadline, getAlertTone, type AlertTone } from "@/lib/alerts";
import { translateFolderName } from "@/lib/i18n";
import { colorThemes, fontChoices, type UserPreferences } from "@/lib/preferences";
import type { AuthUser, FolderDto, NoteSummaryDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROOT_FOLDER_ID = "__notka_root__";

type AppArea = "personal" | "group" | "calendar";

type SidebarProps = {
  user: AuthUser;
  activeArea: AppArea;
  folders: FolderDto[];
  alertShortcutNote: NoteSummaryDto | null;
  pinnedNotes: NoteSummaryDto[];
  notes: NoteSummaryDto[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onAreaChange: (area: AppArea) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectAllNotes: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNoteInFolder: (folderId: string) => void;
  onCreateFolder: (name: string, parentFolderId?: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onMoveFolder: (folderId: string, parentFolderId: string | null) => Promise<void>;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  onCloseSidebar: () => void;
  preferences: UserPreferences;
  onPreferencesChange: (preferences: Partial<UserPreferences>) => void;
  onLogout: () => void;
};

export function Sidebar({
  user,
  activeArea,
  folders,
  alertShortcutNote,
  pinnedNotes,
  notes,
  selectedFolderId,
  selectedNoteId,
  search,
  onSearchChange,
  onAreaChange,
  onSelectFolder,
  onSelectAllNotes,
  onSelectNote,
  onCreateNoteInFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveNoteToFolder,
  onCloseSidebar,
  preferences,
  onPreferencesChange,
  onLogout,
}: SidebarProps) {
  const { language, setLanguage, t } = useI18n();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(() => new Set());
  const folderTree = useMemo(() => buildFolderTree(folders, 1), [folders]);
  const notesByFolder = useMemo(() => groupNotesByFolder(notes), [notes]);
  const rootNotes = notesByFolder.get(ROOT_FOLDER_ID) ?? [];

  async function submitFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newFolderName.trim()) {
      return;
    }

    await onCreateFolder(newFolderName, selectedFolderId);
    setNewFolderName("");
    setNewFolderOpen(false);
  }

  async function renameFolder(folderId: string, currentName: string) {
    const name = window.prompt(t("sidebar.renameFolder"), currentName);

    if (name?.trim()) {
      await onRenameFolder(folderId, name);
    }
  }

  async function deleteFolder(folderId: string) {
    if (window.confirm(t("sidebar.deleteFolderConfirm"))) {
      await onDeleteFolder(folderId);
    }
  }

  function beginFolderDrag(event: DragEvent<HTMLButtonElement>, folderId: string) {
    event.dataTransfer.setData("application/x-notka-folder-id", folderId);
    event.dataTransfer.effectAllowed = "move";
  }

  async function dropOnFolder(event: DragEvent<HTMLElement>, targetFolderId: string) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFolderId(null);

    const noteId = event.dataTransfer.getData("application/x-notka-note-id");
    const folderId = event.dataTransfer.getData("application/x-notka-folder-id");

    if (noteId) {
      await onMoveNoteToFolder(noteId, targetFolderId);
      return;
    }

    if (folderId && folderId !== targetFolderId) {
      await onMoveFolder(folderId, targetFolderId);
    }
  }

  async function dropOnRoot(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragOverFolderId(null);

    const noteId = event.dataTransfer.getData("application/x-notka-note-id");
    const folderId = event.dataTransfer.getData("application/x-notka-folder-id");

    if (noteId) {
      await onMoveNoteToFolder(noteId, null);
      return;
    }

    if (folderId) {
      await onMoveFolder(folderId, null);
    }
  }

  function toggleFolder(folderId: string) {
    setCollapsedFolderIds((current) => {
      const next = new Set(current);

      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }

      return next;
    });
  }

  return (
    <aside className="glass-panel flex h-full min-h-0 flex-col rounded-[1.75rem] p-4">
      <div className="relative mb-5 flex items-center justify-between gap-3 border-b border-black/[0.06] pb-4 dark:border-white/[0.08]">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0">
              <button
                className="group flex min-w-0 items-center gap-1 rounded-xl pr-1 text-left transition hover:text-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:hover:text-teal-200"
                type="button"
                title={t("nav.openSections")}
                aria-label={t("nav.openSections")}
                aria-expanded={sectionMenuOpen}
                onClick={() => setSectionMenuOpen((open) => !open)}
              >
                <span className="truncate text-[1.7rem] font-semibold leading-none text-slate-950 dark:text-white">
                  Notka
                </span>
                <ChevronDown
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-200",
                    sectionMenuOpen && "rotate-180",
                  )}
                />
              </button>
              {sectionMenuOpen ? (
                <div className="settings-popover absolute left-0 top-[calc(100%+0.65rem)] z-50 w-[min(13rem,calc(100vw-2rem))] rounded-2xl p-2">
                  <AreaMenuItem
                    active={activeArea === "personal"}
                    label={t("nav.personalNotes")}
                    onClick={() => {
                      setSectionMenuOpen(false);
                      onAreaChange("personal");
                    }}
                  />
                  <AreaMenuItem
                    active={activeArea === "group"}
                    label={t("nav.groupNotes")}
                    onClick={() => {
                      setSectionMenuOpen(false);
                      onAreaChange("group");
                    }}
                  />
                  <AreaMenuItem
                    active={activeArea === "calendar"}
                    label={t("nav.calendar")}
                    onClick={() => {
                      setSectionMenuOpen(false);
                      onAreaChange("calendar");
                    }}
                  />
                </div>
              ) : null}
            </div>
            {alertShortcutNote ? (
              <button
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/15 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.28)] transition hover:-translate-y-px hover:bg-rose-500/20 focus:outline-none focus:ring-4 focus:ring-rose-500/15 dark:text-rose-300"
                type="button"
                title={t("nav.openAlert", { title: alertShortcutNote.title })}
                aria-label={t("nav.openAlertNote", { title: alertShortcutNote.title })}
                onClick={() => onSelectNote(alertShortcutNote.id)}
              >
                <AlertTriangle className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {user.displayName}
            </p>
            <button
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/60 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-slate-200"
              type="button"
              title={t("settings.title")}
              aria-label={t("settings.open")}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="icon-button"
            type="button"
            title={t("sidebar.hide")}
            aria-label={t("sidebar.hide")}
            onClick={onCloseSidebar}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        {settingsOpen ? (
          <div className="settings-popover fixed inset-x-3 top-24 z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl p-3 sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+0.75rem)] sm:max-h-[min(40rem,calc(100vh-8rem))] sm:w-[min(18rem,calc(100vw-2rem))]">
            <div className="mb-3 px-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("settings.title")}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {t("settings.description")}
              </p>
            </div>

            <SettingsRow label={t("settings.language")}>
              <div className="segmented-control w-full">
                {languages.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={cn(
                      "segmented-button flex-1",
                      language === entry.id && "segmented-button-active",
                    )}
                    onClick={() => setLanguage(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label={t("settings.mode")}>
              <div className="segmented-control w-full">
                {(["dark", "light"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn("segmented-button flex-1", preferences.mode === mode && "segmented-button-active")}
                    onClick={() => onPreferencesChange({ mode })}
                  >
                    {mode === "dark" ? t("settings.dark") : t("settings.light")}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label={t("settings.theme")}>
              <select
                className="notka-input h-10 py-0"
                value={preferences.colorTheme}
                onChange={(event) =>
                  onPreferencesChange({
                    colorTheme: event.target.value as UserPreferences["colorTheme"],
                  })
                }
              >
                {colorThemes.map((theme) => (
                  <option
                    className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100"
                    key={theme.id}
                    value={theme.id}
                  >
                    {theme.name}
                  </option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow label={t("settings.font")}>
              <select
                className="notka-input h-10 py-0"
                value={preferences.font}
                onChange={(event) =>
                  onPreferencesChange({ font: event.target.value as UserPreferences["font"] })
                }
              >
                {fontChoices.map((font) => (
                  <option
                    className="bg-white text-slate-900 dark:bg-navy-900 dark:text-slate-100"
                    key={font.id}
                    value={font.id}
                  >
                    {font.name}
                  </option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow label={t("settings.sidebar")}>
              <div className="segmented-control w-full">
                {(["left", "right"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    className={cn("segmented-button flex-1", preferences.sidebarSide === side && "segmented-button-active")}
                    onClick={() => onPreferencesChange({ sidebarSide: side })}
                  >
                    {side === "left" ? t("settings.left") : t("settings.right")}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label={t("settings.customColors")}>
              <textarea
                className="notka-input min-h-28 resize-y font-mono text-xs leading-5"
                value={preferences.customThemeCss}
                onChange={(event) =>
                  onPreferencesChange({ customThemeCss: event.target.value })
                }
                placeholder={"--notka-accent: #14b8a6;\n--notka-bg: #07111f;"}
                spellCheck={false}
              />
            </SettingsRow>

            <div className="mt-3 border-t border-black/[0.08] pt-3 dark:border-white/[0.09]">
              <button
                className="muted-button w-full justify-start text-rose-600 dark:text-rose-300"
                type="button"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                {t("settings.signOut")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {activeArea === "calendar" ? (
        <div className="min-h-0 flex-1" />
      ) : (
        <>
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="notka-input pl-9"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("sidebar.search")}
            />
          </label>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SidebarSection title={t("sidebar.pinnedNotes")}>
              {pinnedNotes.length > 0 ? (
                pinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    active={selectedNoteId === note.id}
                    compact
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-notka-note-id", note.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => onSelectNote(note.id)}
                  />
                ))
              ) : (
                <EmptyLine text={t("sidebar.noPinnedNotes")} />
              )}
            </SidebarSection>

            <SidebarSection
              title={t("sidebar.folders")}
              action={
                <button
                  className="icon-button h-8 w-8"
                  type="button"
                  title={t("sidebar.newFolder")}
                  aria-label={t("sidebar.newFolder")}
                  onClick={() => setNewFolderOpen((open) => !open)}
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              }
            >
              {newFolderOpen ? (
                <form className="mb-2 flex gap-2" onSubmit={submitFolder}>
                  <input
                    className="notka-input h-9"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder={t("sidebar.folderName")}
                    autoFocus
                  />
                  <button className="muted-button h-9 px-3" type="submit">
                    {t("sidebar.add")}
                  </button>
                </form>
              ) : null}
              <div className="space-y-1">
                <button
                  className={cn(
                    "sidebar-item min-w-0",
                    selectedFolderId === null && "sidebar-item-active",
                  )}
                  type="button"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={dropOnRoot}
                  onClick={onSelectAllNotes}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t("sidebar.allNotes")}</span>
                </button>
                {folderTree.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    notesByFolder={notesByFolder}
                    selectedFolderId={selectedFolderId}
                    dragOverFolderId={dragOverFolderId}
                    selectedNoteId={selectedNoteId}
                    collapsedFolderIds={collapsedFolderIds}
                    onSelectFolder={onSelectFolder}
                    onSelectNote={onSelectNote}
                    onCreateNoteInFolder={onCreateNoteInFolder}
                    onToggleFolder={toggleFolder}
                    onRenameFolder={renameFolder}
                    onDeleteFolder={deleteFolder}
                    onBeginFolderDrag={beginFolderDrag}
                    onDragOverFolder={setDragOverFolderId}
                    onDropOnFolder={dropOnFolder}
                  />
                ))}
                {rootNotes.map((note) => (
                  <TreeNoteItem
                    key={note.id}
                    note={note}
                    active={selectedNoteId === note.id}
                    depth={1}
                    onClick={() => onSelectNote(note.id)}
                  />
                ))}
              </div>
            </SidebarSection>
          </div>
        </>
      )}
    </aside>
  );
}

type FolderNode = FolderDto & {
  children: FolderNode[];
  depth: number;
};

function FolderTreeItem({
  folder,
  notesByFolder,
  selectedFolderId,
  dragOverFolderId,
  selectedNoteId,
  collapsedFolderIds,
  onSelectFolder,
  onSelectNote,
  onCreateNoteInFolder,
  onToggleFolder,
  onRenameFolder,
  onDeleteFolder,
  onBeginFolderDrag,
  onDragOverFolder,
  onDropOnFolder,
}: {
  folder: FolderNode;
  notesByFolder: Map<string, NoteSummaryDto[]>;
  selectedFolderId: string | null;
  dragOverFolderId: string | null;
  selectedNoteId: string | null;
  collapsedFolderIds: Set<string>;
  onSelectFolder: (folderId: string) => void;
  onSelectNote: (noteId: string) => void;
  onCreateNoteInFolder: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, currentName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onBeginFolderDrag: (event: DragEvent<HTMLButtonElement>, folderId: string) => void;
  onDragOverFolder: (folderId: string | null) => void;
  onDropOnFolder: (event: DragEvent<HTMLElement>, targetFolderId: string) => Promise<void>;
}) {
  const { language, t } = useI18n();
  const isActive = selectedFolderId === folder.id;
  const isDragOver = dragOverFolderId === folder.id;
  const folderNotes = notesByFolder.get(folder.id) ?? [];
  const hasContents = folder.children.length > 0 || folderNotes.length > 0;
  const isCollapsed = collapsedFolderIds.has(folder.id);

  return (
    <div>
      <div
        className={cn(
          "group mb-1 flex items-center gap-1 rounded-xl",
          isDragOver && "bg-teal-500/10 ring-2 ring-teal-500/15",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOverFolder(folder.id);
        }}
        onDragLeave={() => onDragOverFolder(null)}
        onDrop={(event) => onDropOnFolder(event, folder.id)}
      >
        <button
          className={cn(
            "flex h-9 w-5 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/60 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
            !hasContents && "pointer-events-none opacity-0",
          )}
          style={{ marginLeft: `${folder.depth * 0.9}rem` }}
          type="button"
          title={isCollapsed ? t("sidebar.showFolderContents") : t("sidebar.hideFolderContents")}
          aria-label={
            isCollapsed
              ? t("sidebar.showContentsOf", { name: translateFolderName(language, folder.name) })
              : t("sidebar.hideContentsOf", { name: translateFolderName(language, folder.name) })
          }
          aria-expanded={hasContents ? !isCollapsed : undefined}
          disabled={!hasContents}
          onClick={() => onToggleFolder(folder.id)}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              hasContents && !isCollapsed && "rotate-90",
            )}
          />
        </button>
        <button
          className={cn("sidebar-item min-w-0 flex-1 py-2", isActive && "sidebar-item-active")}
          type="button"
          draggable
          onDragStart={(event) => onBeginFolderDrag(event, folder.id)}
          onClick={() => onSelectFolder(folder.id)}
        >
          <Folder className="h-4 w-4 shrink-0" />
          <span className="truncate">{translateFolderName(language, folder.name)}</span>
        </button>
        <button
          className="icon-button h-8 w-8 opacity-80 md:opacity-0 md:group-hover:opacity-80"
          type="button"
          title={t("overview.newNote")}
          aria-label={t("overview.newNote")}
          onClick={() => onCreateNoteInFolder(folder.id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          className="icon-button h-8 w-8 opacity-80 md:opacity-0 md:group-hover:opacity-80"
          type="button"
          title={t("sidebar.renameFolder")}
          aria-label={t("sidebar.renameFolderLabel", {
            name: translateFolderName(language, folder.name),
          })}
          onClick={() => onRenameFolder(folder.id, folder.name)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          className="icon-button h-8 w-8 opacity-80 md:opacity-0 md:group-hover:opacity-80"
          type="button"
          title={t("sidebar.deleteFolder")}
          aria-label={t("sidebar.deleteFolderLabel", {
            name: translateFolderName(language, folder.name),
          })}
          onClick={() => onDeleteFolder(folder.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {!isCollapsed ? (
        <>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              notesByFolder={notesByFolder}
              selectedFolderId={selectedFolderId}
              dragOverFolderId={dragOverFolderId}
              selectedNoteId={selectedNoteId}
              collapsedFolderIds={collapsedFolderIds}
              onSelectFolder={onSelectFolder}
              onSelectNote={onSelectNote}
              onCreateNoteInFolder={onCreateNoteInFolder}
              onToggleFolder={onToggleFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onBeginFolderDrag={onBeginFolderDrag}
              onDragOverFolder={onDragOverFolder}
              onDropOnFolder={onDropOnFolder}
            />
          ))}
          {folderNotes.map((note) => (
            <TreeNoteItem
              key={note.id}
              note={note}
              active={selectedNoteId === note.id}
              depth={folder.depth + 1}
              onClick={() => onSelectNote(note.id)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function buildFolderTree(folders: FolderDto[], rootDepth = 0) {
  const nodes = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  for (const folder of folders) {
    nodes.set(folder.id, { ...folder, children: [], depth: 0 });
  }

  for (const node of nodes.values()) {
    const parent = node.parentFolderId ? nodes.get(node.parentFolderId) : null;

    if (parent && parent.id !== node.id) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: FolderNode[], depth: number): FolderNode[] =>
    items
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((item) => ({
        ...item,
        depth,
        children: sortNodes(item.children, depth + 1),
      }));

  return sortNodes(roots, rootDepth);
}

function groupNotesByFolder(notes: NoteSummaryDto[]) {
  const grouped = new Map<string, NoteSummaryDto[]>();

  for (const note of notes) {
    const folderId = note.folderId ?? ROOT_FOLDER_ID;
    const current = grouped.get(folderId) ?? [];
    current.push(note);
    grouped.set(folderId, current);
  }

  for (const [folderId, folderNotes] of grouped) {
    grouped.set(folderId, folderNotes.sort((a, b) => a.title.localeCompare(b.title)));
  }

  return grouped;
}

function AreaMenuItem({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500/15 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white",
        active && "bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-200",
      )}
      type="button"
      onClick={onClick}
    >
      {label}
      {active ? (
        <span className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_14px_rgba(20,184,166,0.5)]" />
      ) : null}
    </button>
  );
}

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 block last:mb-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function SidebarSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TreeNoteItem({
  note,
  active,
  depth,
  onClick,
}: {
  note: NoteSummaryDto;
  active: boolean;
  depth: number;
  onClick: () => void;
}) {
  const { language, t } = useI18n();
  const alertTone = getAlertTone(note.alertAt);
  const alertLabel = formatAlertDeadline(note.alertAt, language);

  return (
    <button
      className={cn(
        "sidebar-item mb-1 min-w-0 border border-transparent py-1.5 text-xs",
        noteAlertClass(alertTone),
        active && "sidebar-item-active",
      )}
      title={alertLabel ? t("editor.deadlineTitle", { date: alertLabel }) : undefined}
      style={{ paddingLeft: `${1.65 + depth * 0.9}rem` }}
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-notka-note-id", note.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
      <span className="min-w-0 flex-1 truncate">{note.title}</span>
      {alertTone !== "none" ? (
        <AlertTriangle
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            alertTone === "red" && "text-rose-500 dark:text-rose-300",
            alertTone === "yellow" && "text-amber-600 dark:text-amber-300",
            alertTone === "neon" && "text-teal-600 dark:text-teal-300",
          )}
        />
      ) : null}
      {note.checklistTotal > 0 ? (
        <span className="ml-auto rounded-full border border-teal-500/10 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
          {note.checklistCompleted}/{note.checklistTotal}
        </span>
      ) : null}
    </button>
  );
}

function NoteListItem({
  note,
  active,
  compact = false,
  onDragStart,
  onClick,
}: {
  note: NoteSummaryDto;
  active: boolean;
  compact?: boolean;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  const { language, t } = useI18n();
  const alertTone = getAlertTone(note.alertAt);
  const alertLabel = formatAlertDeadline(note.alertAt, language);

  return (
    <button
      className={cn(
        "sidebar-item mb-1.5 border border-transparent",
        compact ? "py-2" : "flex-col items-start gap-1.5",
        noteAlertClass(alertTone),
        active && "sidebar-item-active",
      )}
      title={compact ? note.title : alertLabel ? t("editor.deadlineTitle", { date: alertLabel }) : undefined}
      type="button"
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onClick={onClick}
    >
      {compact ? (
        <span className="min-w-0 flex-1 truncate font-medium">{note.title}</span>
      ) : (
        <>
          <span className="flex w-full items-center gap-2">
            {note.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
            <span className="truncate font-medium">{note.title}</span>
            {alertTone !== "none" ? (
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  alertTone === "red" && "text-rose-500 dark:text-rose-300",
                  alertTone === "yellow" && "text-amber-600 dark:text-amber-300",
                  alertTone === "neon" && "text-teal-600 dark:text-teal-300",
                )}
              />
            ) : null}
            {note.checklistTotal > 0 ? (
              <span className="ml-auto rounded-full border border-teal-500/10 bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                {note.checklistCompleted}/{note.checklistTotal}
              </span>
            ) : null}
          </span>
          {note.excerpt ? (
            <span className="line-clamp-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
              {note.excerpt}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

function noteAlertClass(tone: AlertTone) {
  if (tone === "red") {
    return "border-rose-400/30 bg-rose-500/[0.1] shadow-[0_0_24px_rgba(244,63,94,0.22)] hover:border-rose-400/45 dark:bg-rose-500/[0.08]";
  }

  if (tone === "yellow") {
    return "border-amber-400/30 bg-amber-500/[0.1] shadow-[0_0_22px_rgba(245,158,11,0.18)] hover:border-amber-400/45 dark:bg-amber-500/[0.08]";
  }

  if (tone === "neon") {
    return "border-teal-400/30 bg-teal-500/[0.1] shadow-[0_0_22px_rgba(45,212,191,0.22)] hover:border-teal-400/45 dark:bg-teal-500/[0.08]";
  }

  return "";
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-black/[0.06] px-3 py-2.5 text-sm text-slate-400 dark:border-white/[0.07] dark:text-slate-500">
      {text}
    </p>
  );
}
