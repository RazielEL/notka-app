export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

export type AppUserDto = {
  id: string;
  email: string;
  displayName: string;
};

export type NoteScope = "personal" | "group";

export type FolderDto = {
  id: string;
  scope: NoteScope;
  parentFolderId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteSummaryDto = {
  id: string;
  scope: NoteScope;
  folderId: string | null;
  title: string;
  pinned: boolean;
  alertAt: string | null;
  calendarAt: string | null;
  excerpt: string | null;
  checklistTotal: number;
  checklistCompleted: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteDetailDto = NoteSummaryDto & {
  content: string;
  contentHash: string;
};

export type TemplateDto = {
  id: string;
  name: string;
  builtIn: boolean;
  createdAt?: string;
  updatedAt?: string;
};
