import type { TemplateDto } from "@/lib/types";

const en = {
  "app.description": "A minimal self-hosted Markdown notebook.",
  "menu.hide": "Hide menu",

  "auth.brand": "NOTKA",
  "auth.loginTitle": "Welcome back",
  "auth.loginSubtitle": "Sign in to your private notebook.",
  "auth.registerTitle": "Create account",
  "auth.registerSubtitle": "Join this private Notka instance.",
  "auth.setupTitle": "Create the first admin",
  "auth.setupSubtitle": "Setup closes after this account exists.",
  "auth.name": "Name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign in",
  "auth.signingIn": "Signing in",
  "auth.createAccount": "Create account",
  "auth.creatingAccount": "Creating account",
  "auth.createAdmin": "Create admin",
  "auth.creatingAdmin": "Creating admin",
  "auth.needAccount": "Need an account?",
  "auth.createOne": "Create one",
  "auth.haveAccount": "Already have an account?",
  "auth.loginError": "Could not sign in.",
  "auth.registerError": "Could not create account.",
  "auth.setupError": "Could not finish setup.",
  "auth.invalidCredentials": "Invalid email or password.",
  "auth.firstSetupRequired": "Create the first admin account in setup first.",
  "auth.invalidEmail": "Enter a valid email address.",
  "auth.passwordLength": "Password must be at least 8 characters.",
  "auth.emailExists": "An account with this email already exists.",

  "nav.personalNotes": "Personal Notes",
  "nav.groupNotes": "Group Notes",
  "nav.calendar": "Calendar",
  "nav.openSections": "Open sections",
  "nav.openAlert": "Open alert: {title}",
  "nav.openAlertNote": "Open alert note {title}",

  "settings.title": "Settings",
  "settings.description": "Local display preferences",
  "settings.language": "Language",
  "settings.mode": "Mode",
  "settings.theme": "Theme",
  "settings.font": "Font",
  "settings.sidebar": "Sidebar",
  "settings.customColors": "Custom colors",
  "settings.dark": "Dark",
  "settings.light": "Light",
  "settings.left": "Left",
  "settings.right": "Right",
  "settings.export": "Export",
  "settings.exportNotes": "Export notes .zip",
  "settings.exporting": "Preparing...",
  "settings.exportError": "Could not export notes.",
  "settings.hiddenPin": "Hidden PIN",
  "settings.hiddenPinPlaceholder": "4-12 digits",
  "settings.hiddenPasswordPlaceholder": "Account password",
  "settings.saveHiddenPin": "Save PIN",
  "settings.clearHiddenPin": "Clear PIN",
  "settings.hiddenPinSaved": "Hidden PIN saved.",
  "settings.hiddenPinError": "Could not save Hidden PIN.",
  "settings.hiddenPasswordRequired": "Enter your account password first.",
  "settings.open": "Open settings",
  "settings.signOut": "Sign out",

  "sidebar.hide": "Hide sidebar",
  "sidebar.show": "Show sidebar",
  "sidebar.menu": "Menu",
  "sidebar.close": "Close sidebar",
  "sidebar.search": "Search notes",
  "sidebar.pinnedNotes": "Pinned Notes",
  "sidebar.noPinnedNotes": "No pinned notes",
  "sidebar.folders": "Folders",
  "sidebar.newFolder": "New folder",
  "sidebar.folderName": "Folder name",
  "sidebar.add": "Add",
  "sidebar.trash": "Trash",
  "sidebar.hiddenNotes": "Hidden Notes",
  "sidebar.allNotes": "All notes",
  "sidebar.renameFolder": "Rename folder",
  "sidebar.renameFolderLabel": "Rename {name}",
  "sidebar.deleteFolder": "Delete folder",
  "sidebar.deleteFolderLabel": "Delete {name}",
  "sidebar.showFolderContents": "Show folder contents",
  "sidebar.hideFolderContents": "Hide folder contents",
  "sidebar.showContentsOf": "Show contents of {name}",
  "sidebar.hideContentsOf": "Hide contents of {name}",
  "sidebar.deleteFolderConfirm": "Delete this folder and nested folders? Notes inside them will move to All notes.",

  "alertNotes.title": "Alert Notes",
  "alertNotes.open": "Open Alert Notes",
  "alertNotes.new": "New alert note",
  "alertNotes.editPanel": "Edit alert note",
  "alertNotes.entries": "Entries",
  "alertNotes.noAlertNotes": "No alert notes",
  "alertNotes.text": "Text",
  "alertNotes.textPlaceholder": "Short note",
  "alertNotes.dateTime": "Date and time",
  "alertNotes.recurrence": "Repeat",
  "alertNotes.recurrenceNone": "Once",
  "alertNotes.recurrenceDaily": "Daily",
  "alertNotes.recurrenceWeekly": "Weekly",
  "alertNotes.recurrenceMonthly": "Monthly",
  "alertNotes.recurrenceYearly": "Yearly",
  "alertNotes.ends": "Ends",
  "alertNotes.editScope": "Edit",
  "alertNotes.thisOccurrence": "Only this",
  "alertNotes.futureOccurrences": "This and future",
  "alertNotes.allOccurrences": "All",
  "alertNotes.save": "Save",
  "alertNotes.saving": "Saving",
  "alertNotes.cancel": "Cancel",
  "alertNotes.edit": "Edit alert note",
  "alertNotes.delete": "Delete alert note",
  "alertNotes.deleteConfirm": "Delete this alert note?",

  "overview.newNote": "New note",
  "overview.noGroupNotes": "No group notes yet",
  "overview.noNotes": "No notes here yet.",
  "overview.noTrashNotes": "Trash is empty.",
  "overview.noHiddenNotes": "No hidden notes.",

  "hidden.title": "Hidden Notes",
  "hidden.locked": "Locked",
  "hidden.unlock": "Unlock",
  "hidden.unlocking": "Unlocking...",
  "hidden.pinOrPassword": "PIN or password",
  "hidden.invalidUnlock": "Invalid PIN or password.",

  "editor.untitledNote": "Untitled note",
  "editor.saved": "Saved",
  "editor.saving": "Saving...",
  "editor.unsaved": "Unsaved",
  "editor.save": "Save",
  "editor.saveNote": "Save note",
  "editor.pin": "Pin",
  "editor.unpin": "Unpin",
  "editor.pinNote": "Pin note",
  "editor.unpinNote": "Unpin note",
  "editor.hide": "Hide",
  "editor.hideNote": "Hide note",
  "editor.hideConfirm": "Move this note to Hidden Notes?",
  "editor.unhide": "Unhide",
  "editor.unhideNote": "Unhide note",
  "editor.unhideConfirm": "Move this note back to All notes?",
  "editor.delete": "Delete",
  "editor.deleteNote": "Delete note",
  "editor.moveToTrashConfirm": "Move this note to trash?",
  "editor.deleteForever": "Delete forever",
  "editor.deleteForeverNote": "Delete note permanently",
  "editor.deleteForeverConfirm": "Permanently delete this note? This cannot be undone.",
  "editor.folder": "Folder",
  "editor.checklist": "Checklist",
  "editor.table": "Table",
  "editor.deadline": "Deadline",
  "editor.deadlineTitle": "Deadline {date}",
  "editor.deadlineSetFor": "Set for {date}",
  "editor.setAlert": "Set alert",
  "editor.editAlert": "Edit alert",
  "editor.editAlertDeadline": "Edit alert deadline {date}",
  "editor.alertHelp": "Show this note before the deadline.",
  "editor.calendar": "Calendar",
  "editor.calendarTitle": "Calendar {date}",
  "editor.addToCalendar": "Add to calendar",
  "editor.editCalendar": "Edit calendar",
  "editor.editCalendarDate": "Edit calendar date {date}",
  "editor.calendarAddedFor": "Added for {date}",
  "editor.calendarHelp": "Add this note to the calendar.",
  "editor.dateAndTime": "Date and time",
  "editor.addCategory": "Add category",
  "editor.templates": "Templates",
  "editor.openTemplateActions": "Open template actions",
  "editor.newFromTemplate": "New from template",
  "editor.newFromSelectedTemplate": "New from {name}",
  "editor.templateFallback": "template",
  "editor.saveCurrentAsTemplate": "Save current as template",
  "editor.templateName": "Template name",
  "editor.templateSuffix": "{title} template",
  "editor.preview": "Preview",
  "editor.markdown": "Markdown",
  "editor.split": "Split",
  "editor.viewMode": "Note view mode",
  "editor.category": "Category",
  "editor.categoryName": "Category name",
  "editor.deleteCategory": "Delete category",
  "editor.deleteCategoryLabel": "Delete category {name}",
  "editor.deleteCategoryConfirm": "Delete \"{name}\" and its entries?",
  "editor.addEntry": "Add entry",
  "editor.newEntry": "New entry",
  "editor.deleteEntry": "Delete entry",
  "editor.deleteEntryLabel": "Delete entry {name}",
  "editor.markComplete": "Mark as complete",
  "editor.markIncomplete": "Mark as incomplete",
  "editor.addColumn": "Add column",
  "editor.addRow": "Add row",
  "editor.deleteRow": "Delete row",
  "editor.deleteRowLabel": "Delete row {number}",
  "editor.column": "Column {number}",
  "editor.empty": "Empty",
  "editor.nothingToPreview": "Nothing to preview yet.",
  "editor.untitledTask": "Untitled task",

  "calendar.title": "Calendar",
  "calendar.showGroupNotes": "Show Group Notes",
  "calendar.previousMonth": "Previous month",
  "calendar.nextMonth": "Next month",
  "calendar.today": "Today",
  "calendar.ok": "OK",
  "calendar.soon": "Soon",
  "calendar.due": "Due",
  "calendar.noEntries": "No entries",
  "calendar.more": "+{count} more",
  "calendar.upcoming": "Upcoming",
  "calendar.noCalendarEntries": "No calendar entries",
  "calendar.kindAlert": "Alert",
  "calendar.kindNote": "Note",
  "calendar.kindAlertNote": "Alert Note",
  "calendar.eventTitle": "{kind}: {title}",

  "group.visibleTo": "Visible to",
  "group.peopleTitle": "People who can see Group Notes",
  "group.peopleLabel": "Show people who can see Group Notes",
  "group.access": "Group Notes Access",

  "confirm.unsavedSwitch": "You have unsaved changes. Switch areas anyway?",

  "template.blank": "Blank note",
  "template.checklist": "Checklist",
  "template.table": "Table",
  "template.daily": "Daily note",

  "folder.inbox": "Inbox",
  "folder.groupInbox": "Group Inbox",
} as const;

export type TranslationKey = keyof typeof en;

const pl: Record<TranslationKey, string> = {
  "app.description": "Minimalny, self-hosted notes Markdown.",
  "menu.hide": "Ukryj menu",

  "auth.brand": "NOTKA",
  "auth.loginTitle": "Witaj ponownie",
  "auth.loginSubtitle": "Zaloguj się do swojego prywatnego notesu.",
  "auth.registerTitle": "Utwórz konto",
  "auth.registerSubtitle": "Dołącz do tej prywatnej instancji Notka.",
  "auth.setupTitle": "Utwórz pierwszego administratora",
  "auth.setupSubtitle": "Konfiguracja zostanie zamknięta po utworzeniu tego konta.",
  "auth.name": "Imię",
  "auth.email": "Email",
  "auth.password": "Hasło",
  "auth.signIn": "Zaloguj",
  "auth.signingIn": "Logowanie",
  "auth.createAccount": "Utwórz konto",
  "auth.creatingAccount": "Tworzenie konta",
  "auth.createAdmin": "Utwórz administratora",
  "auth.creatingAdmin": "Tworzenie administratora",
  "auth.needAccount": "Potrzebujesz konta?",
  "auth.createOne": "Utwórz je",
  "auth.haveAccount": "Masz już konto?",
  "auth.loginError": "Nie udało się zalogować.",
  "auth.registerError": "Nie udało się utworzyć konta.",
  "auth.setupError": "Nie udało się zakończyć konfiguracji.",
  "auth.invalidCredentials": "Nieprawidłowy email lub hasło.",
  "auth.firstSetupRequired": "Najpierw utwórz pierwsze konto administratora w konfiguracji.",
  "auth.invalidEmail": "Podaj prawidłowy adres email.",
  "auth.passwordLength": "Hasło musi mieć co najmniej 8 znaków.",
  "auth.emailExists": "Konto z tym adresem email już istnieje.",

  "nav.personalNotes": "Notatki osobiste",
  "nav.groupNotes": "Notatki grupowe",
  "nav.calendar": "Kalendarz",
  "nav.openSections": "Otwórz sekcje",
  "nav.openAlert": "Otwórz alert: {title}",
  "nav.openAlertNote": "Otwórz notatkę alertu {title}",

  "settings.title": "Ustawienia",
  "settings.description": "Lokalne preferencje wyświetlania",
  "settings.language": "Język",
  "settings.mode": "Tryb",
  "settings.theme": "Motyw",
  "settings.font": "Font",
  "settings.sidebar": "Panel boczny",
  "settings.customColors": "Własne kolory",
  "settings.dark": "Ciemny",
  "settings.light": "Jasny",
  "settings.left": "Lewy",
  "settings.right": "Prawy",
  "settings.export": "Eksport",
  "settings.exportNotes": "Eksportuj notatki .zip",
  "settings.exporting": "Przygotowywanie...",
  "settings.exportError": "Nie udało się wyeksportować notatek.",
  "settings.hiddenPin": "PIN Hidden",
  "settings.hiddenPinPlaceholder": "4-12 cyfr",
  "settings.hiddenPasswordPlaceholder": "Hasło konta",
  "settings.saveHiddenPin": "Zapisz PIN",
  "settings.clearHiddenPin": "Wyczyść PIN",
  "settings.hiddenPinSaved": "PIN Hidden zapisany.",
  "settings.hiddenPinError": "Nie udało się zapisać PIN-u Hidden.",
  "settings.hiddenPasswordRequired": "Najpierw wpisz hasło konta.",
  "settings.open": "Otwórz ustawienia",
  "settings.signOut": "Wyloguj",

  "sidebar.hide": "Ukryj panel boczny",
  "sidebar.show": "Pokaż panel boczny",
  "sidebar.menu": "Menu",
  "sidebar.close": "Zamknij panel boczny",
  "sidebar.search": "Szukaj notatek",
  "sidebar.pinnedNotes": "Przypięte notatki",
  "sidebar.noPinnedNotes": "Brak przypiętych notatek",
  "sidebar.folders": "Foldery",
  "sidebar.newFolder": "Nowy folder",
  "sidebar.folderName": "Nazwa folderu",
  "sidebar.add": "Dodaj",
  "sidebar.trash": "Kosz",
  "sidebar.hiddenNotes": "Hidden Notes",
  "sidebar.allNotes": "Wszystkie notatki",
  "sidebar.renameFolder": "Zmień nazwę folderu",
  "sidebar.renameFolderLabel": "Zmień nazwę {name}",
  "sidebar.deleteFolder": "Usuń folder",
  "sidebar.deleteFolderLabel": "Usuń {name}",
  "sidebar.showFolderContents": "Pokaż zawartość folderu",
  "sidebar.hideFolderContents": "Ukryj zawartość folderu",
  "sidebar.showContentsOf": "Pokaż zawartość {name}",
  "sidebar.hideContentsOf": "Ukryj zawartość {name}",
  "sidebar.deleteFolderConfirm": "Usunąć ten folder i podfoldery? Notatki w środku zostaną przeniesione do Wszystkich notatek.",

  "alertNotes.title": "Alert Notes",
  "alertNotes.open": "Otwórz Alert Notes",
  "alertNotes.new": "Nowy alert note",
  "alertNotes.editPanel": "Edytuj alert note",
  "alertNotes.entries": "Wpisy",
  "alertNotes.noAlertNotes": "Brak alert notes",
  "alertNotes.text": "Treść",
  "alertNotes.textPlaceholder": "Krótka notatka",
  "alertNotes.dateTime": "Data i godzina",
  "alertNotes.recurrence": "Powtarzanie",
  "alertNotes.recurrenceNone": "Jednorazowo",
  "alertNotes.recurrenceDaily": "Codziennie",
  "alertNotes.recurrenceWeekly": "Co tydzień",
  "alertNotes.recurrenceMonthly": "Co miesiąc",
  "alertNotes.recurrenceYearly": "Co rok",
  "alertNotes.ends": "Koniec",
  "alertNotes.editScope": "Edycja",
  "alertNotes.thisOccurrence": "Tylko ten",
  "alertNotes.futureOccurrences": "Ten i przyszłe",
  "alertNotes.allOccurrences": "Wszystkie",
  "alertNotes.save": "Zapisz",
  "alertNotes.saving": "Zapisywanie",
  "alertNotes.cancel": "Anuluj",
  "alertNotes.edit": "Edytuj alert note",
  "alertNotes.delete": "Usuń alert note",
  "alertNotes.deleteConfirm": "Usunąć ten alert note?",

  "overview.newNote": "Nowa notatka",
  "overview.noGroupNotes": "Nie ma jeszcze notatek grupowych",
  "overview.noNotes": "Nie ma tu jeszcze notatek.",
  "overview.noTrashNotes": "Kosz jest pusty.",
  "overview.noHiddenNotes": "Brak ukrytych notatek.",

  "hidden.title": "Hidden Notes",
  "hidden.locked": "Zablokowane",
  "hidden.unlock": "Odblokuj",
  "hidden.unlocking": "Odblokowywanie...",
  "hidden.pinOrPassword": "PIN lub hasło",
  "hidden.invalidUnlock": "Nieprawidłowy PIN lub hasło.",

  "editor.untitledNote": "Notatka bez tytułu",
  "editor.saved": "Zapisano",
  "editor.saving": "Zapisywanie...",
  "editor.unsaved": "Niezapisane",
  "editor.save": "Zapisz",
  "editor.saveNote": "Zapisz notatkę",
  "editor.pin": "Przypnij",
  "editor.unpin": "Odepnij",
  "editor.pinNote": "Przypnij notatkę",
  "editor.unpinNote": "Odepnij notatkę",
  "editor.hide": "Ukryj",
  "editor.hideNote": "Ukryj notatkę",
  "editor.hideConfirm": "Przenieść tę notatkę do Hidden Notes?",
  "editor.unhide": "Odkryj",
  "editor.unhideNote": "Odkryj notatkę",
  "editor.unhideConfirm": "Przenieść tę notatkę z powrotem do Wszystkich notatek?",
  "editor.delete": "Usuń",
  "editor.deleteNote": "Usuń notatkę",
  "editor.moveToTrashConfirm": "Przenieść tę notatkę do kosza?",
  "editor.deleteForever": "Usuń trwale",
  "editor.deleteForeverNote": "Usuń notatkę trwale",
  "editor.deleteForeverConfirm": "Trwale usunąć tę notatkę? Tego nie da się cofnąć.",
  "editor.folder": "Folder",
  "editor.checklist": "Lista zadań",
  "editor.table": "Tabela",
  "editor.deadline": "Termin",
  "editor.deadlineTitle": "Termin {date}",
  "editor.deadlineSetFor": "Ustawiono na {date}",
  "editor.setAlert": "Ustaw alert",
  "editor.editAlert": "Edytuj alert",
  "editor.editAlertDeadline": "Edytuj termin alertu {date}",
  "editor.alertHelp": "Pokaż tę notatkę przed terminem.",
  "editor.calendar": "Kalendarz",
  "editor.calendarTitle": "Kalendarz {date}",
  "editor.addToCalendar": "Dodaj do kalendarza",
  "editor.editCalendar": "Edytuj kalendarz",
  "editor.editCalendarDate": "Edytuj datę w kalendarzu {date}",
  "editor.calendarAddedFor": "Dodano na {date}",
  "editor.calendarHelp": "Dodaj tę notatkę do kalendarza.",
  "editor.dateAndTime": "Data i godzina",
  "editor.addCategory": "Dodaj kategorię",
  "editor.templates": "Szablony",
  "editor.openTemplateActions": "Otwórz akcje szablonów",
  "editor.newFromTemplate": "Nowa z szablonu",
  "editor.newFromSelectedTemplate": "Nowa z {name}",
  "editor.templateFallback": "szablonu",
  "editor.saveCurrentAsTemplate": "Zapisz bieżącą jako szablon",
  "editor.templateName": "Nazwa szablonu",
  "editor.templateSuffix": "Szablon: {title}",
  "editor.preview": "Podgląd",
  "editor.markdown": "Markdown",
  "editor.split": "Podział",
  "editor.viewMode": "Tryb widoku notatki",
  "editor.category": "Kategoria",
  "editor.categoryName": "Nazwa kategorii",
  "editor.deleteCategory": "Usuń kategorię",
  "editor.deleteCategoryLabel": "Usuń kategorię {name}",
  "editor.deleteCategoryConfirm": "Usunąć \"{name}\" i jej wpisy?",
  "editor.addEntry": "Dodaj wpis",
  "editor.newEntry": "Nowy wpis",
  "editor.deleteEntry": "Usuń wpis",
  "editor.deleteEntryLabel": "Usuń wpis {name}",
  "editor.markComplete": "Oznacz jako ukończone",
  "editor.markIncomplete": "Oznacz jako nieukończone",
  "editor.addColumn": "Dodaj kolumnę",
  "editor.addRow": "Dodaj wiersz",
  "editor.deleteRow": "Usuń wiersz",
  "editor.deleteRowLabel": "Usuń wiersz {number}",
  "editor.column": "Kolumna {number}",
  "editor.empty": "Puste",
  "editor.nothingToPreview": "Nie ma jeszcze nic do podglądu.",
  "editor.untitledTask": "Zadanie bez tytułu",

  "calendar.title": "Kalendarz",
  "calendar.showGroupNotes": "Pokaż notatki grupowe",
  "calendar.previousMonth": "Poprzedni miesiąc",
  "calendar.nextMonth": "Następny miesiąc",
  "calendar.today": "Dzisiaj",
  "calendar.ok": "OK",
  "calendar.soon": "Wkrótce",
  "calendar.due": "Termin",
  "calendar.noEntries": "Brak wpisów",
  "calendar.more": "+{count} więcej",
  "calendar.upcoming": "Nadchodzące",
  "calendar.noCalendarEntries": "Brak wpisów w kalendarzu",
  "calendar.kindAlert": "Alert",
  "calendar.kindNote": "Notatka",
  "calendar.kindAlertNote": "Alert Note",
  "calendar.eventTitle": "{kind}: {title}",

  "group.visibleTo": "Widoczne dla",
  "group.peopleTitle": "Osoby, które widzą notatki grupowe",
  "group.peopleLabel": "Pokaż osoby, które widzą notatki grupowe",
  "group.access": "Dostęp do notatek grupowych",

  "confirm.unsavedSwitch": "Masz niezapisane zmiany. Przełączyć sekcję mimo to?",

  "template.blank": "Pusta notatka",
  "template.checklist": "Lista zadań",
  "template.table": "Tabela",
  "template.daily": "Notatka dzienna",

  "folder.inbox": "Inbox",
  "folder.groupInbox": "Inbox grupowy",
};

export const languages = [
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "pl", label: "Polski", shortLabel: "PL" },
] as const;

export type Language = (typeof languages)[number]["id"];

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  pl,
};

const errorTranslationKeys: Record<string, TranslationKey> = {
  "Could not sign in.": "auth.loginError",
  "Could not create account.": "auth.registerError",
  "Could not finish setup.": "auth.setupError",
  "Invalid email or password.": "auth.invalidCredentials",
  "Create the first admin account in setup first.": "auth.firstSetupRequired",
  "Enter a valid email address.": "auth.invalidEmail",
  "Password must be at least 8 characters.": "auth.passwordLength",
  "An account with this email already exists.": "auth.emailExists",
};

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "pl";
}

export function normalizeLanguage(value: unknown): Language {
  if (isLanguage(value)) {
    return value;
  }

  if (typeof value === "string" && value.toLowerCase().startsWith("pl")) {
    return "pl";
  }

  return "en";
}

export function localeForLanguage(language: Language) {
  return language === "pl" ? "pl-PL" : "en-US";
}

export function translate(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number | null | undefined>,
) {
  const text = dictionaries[language][key] ?? dictionaries.en[key] ?? key;

  if (!values) {
    return text;
  }

  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

export function translateApiError(
  language: Language,
  message: unknown,
  fallbackKey: TranslationKey,
) {
  if (typeof message !== "string" || !message.trim()) {
    return translate(language, fallbackKey);
  }

  const key = errorTranslationKeys[message];
  return key ? translate(language, key) : message;
}

export function translateTemplateName(language: Language, template: TemplateDto) {
  if (!template.builtIn) {
    return template.name;
  }

  return translateBuiltInTemplateName(language, template.id);
}

export function translateBuiltInTemplateName(language: Language, templateId: string) {
  if (templateId === "checklist") {
    return translate(language, "template.checklist");
  }

  if (templateId === "table") {
    return translate(language, "template.table");
  }

  if (templateId === "daily") {
    return translate(language, "template.daily");
  }

  return translate(language, "template.blank");
}

export function translateFolderName(language: Language, name: string) {
  if (name === "Group Inbox") {
    return translate(language, "folder.groupInbox");
  }

  if (name === "Inbox") {
    return translate(language, "folder.inbox");
  }

  return name;
}

export function getBuiltInTemplateBody(templateId: string, language: Language) {
  if (templateId === "checklist") {
    return language === "pl"
      ? "<!-- notka:type=checklist -->\n# Lista zadań\n\n- [ ] Pierwszy punkt\n- [ ] Drugi punkt\n- [ ] Trzeci punkt\n"
      : "<!-- notka:type=checklist -->\n# Checklist\n\n- [ ] First item\n- [ ] Second item\n- [ ] Third item\n";
  }

  if (templateId === "table") {
    return language === "pl"
      ? "<!-- notka:type=table -->\n# Tabela\n\n| Kolumna 1 | Kolumna 2 |\n| --- | --- |\n|  |  |\n"
      : "<!-- notka:type=table -->\n# Table\n\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n";
  }

  if (templateId === "daily") {
    const today = new Date().toLocaleDateString("en-CA");

    return `# ${today}\n\n## Notes\n\n- \n\n## Checklist\n\n- [ ] \n- [ ] \n- [ ] \n\n## Work\n\n- \n\n## Important\n\n- \n\n## Tomorrow\n\n- [ ] \n`;
  }

  return language === "pl" ? "# Notatka bez tytułu\n\n" : "# Untitled note\n\n";
}

export function getWelcomeNote(language: Language) {
  if (language === "pl") {
    return {
      title: "Witaj w Notka",
      content:
        "# Witaj w Notka\n\nTo jest Twój prywatny notes Markdown.\n\n- [x] Utwórz pierwsze konto administratora\n- [ ] Napisz notatkę\n- [ ] Prowadź listę zadań w Markdown\n\nNotatki i listy zadań działają tutaj razem. Lista zadań to zwykły Markdown.\n",
    };
  }

  return {
    title: "Welcome to Notka",
    content:
      "# Welcome to Notka\n\nThis is your private Markdown notebook.\n\n- [x] Create the first admin user\n- [ ] Write a note\n- [ ] Keep a checklist in Markdown\n\nNotes and checklists live together here. A checklist is just Markdown.\n",
  };
}
