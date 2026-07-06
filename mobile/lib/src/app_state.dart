import 'package:flutter/foundation.dart';

import 'models.dart';
import 'notka_api.dart';
import 'session_store.dart';

enum AppPhase { booting, needsServer, needsSetup, needsLogin, signedIn }

enum SaveResult { saved, conflict, failed }

enum WorkspaceView { notes, trash }

class NotkaAppState extends ChangeNotifier {
  NotkaAppState({ServerConfigStore? configStore, SessionStore? sessionStore})
    : _configStore = configStore ?? ServerConfigStore(),
      _sessionStore = sessionStore ?? SessionStore();

  final ServerConfigStore _configStore;
  final SessionStore _sessionStore;

  AppPhase phase = AppPhase.booting;
  String? serverUrl;
  String? sessionCookie;
  AuthUser? user;
  NoteScope activeScope = NoteScope.personal;
  WorkspaceView activeView = WorkspaceView.notes;
  String? selectedFolderId;
  String searchQuery = '';
  List<FolderDto> folders = const [];
  List<NoteSummaryDto> notes = const [];
  List<NoteSummaryDto> trashNotes = const [];
  List<TemplateDto> templates = const [];
  NoteDetailDto? selectedNote;
  bool selectedNoteIsTrash = false;
  bool selectedNoteConflict = false;
  bool busy = false;
  String? errorMessage;

  FolderDto? get selectedFolder {
    final id = selectedFolderId;
    if (id == null) {
      return null;
    }

    for (final folder in folders) {
      if (folder.id == id) {
        return folder;
      }
    }

    return null;
  }

  List<NoteSummaryDto> get visibleNotes {
    final folderId = selectedFolderId;
    final query = searchQuery.trim().toLowerCase();
    final scopedNotes = folderId == null
        ? notes
        : notes.where((note) => note.folderId == folderId);

    if (query.isEmpty) {
      return scopedNotes.toList(growable: false);
    }

    return scopedNotes
        .where((note) {
          return note.title.toLowerCase().contains(query) ||
              (note.excerpt ?? '').toLowerCase().contains(query);
        })
        .toList(growable: false);
  }

  List<NoteSummaryDto> get visibleTrashNotes {
    final query = searchQuery.trim().toLowerCase();
    final filtered = trashNotes
        .where((note) {
          return query.isEmpty ||
              note.title.toLowerCase().contains(query) ||
              (note.excerpt ?? '').toLowerCase().contains(query);
        })
        .toList(growable: false);

    filtered.sort((a, b) {
      final aDate = a.deletedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bDate = b.deletedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bDate.compareTo(aDate);
    });

    return filtered;
  }

  NotkaApiClient? get _api {
    final url = serverUrl;
    if (url == null || url.isEmpty) {
      return null;
    }

    return NotkaApiClient(
      baseUrl: url,
      sessionCookie: sessionCookie,
      onSessionCookieChanged: (cookie) async {
        sessionCookie = cookie;
        await _sessionStore.writeSessionCookie(cookie);
        notifyListeners();
      },
    );
  }

  Future<void> initialize() async {
    phase = AppPhase.booting;
    notifyListeners();

    serverUrl = await _configStore.readServerUrl();
    sessionCookie = await _sessionStore.readSessionCookie();

    if (serverUrl == null || serverUrl!.isEmpty) {
      phase = AppPhase.needsServer;
      notifyListeners();
      return;
    }

    await refreshBootstrap();
  }

  Future<void> connectToServer(String value) async {
    await _run(() async {
      final api = NotkaApiClient(
        baseUrl: value,
        sessionCookie: sessionCookie,
        onSessionCookieChanged: (cookie) async {
          sessionCookie = cookie;
          await _sessionStore.writeSessionCookie(cookie);
        },
      );
      final status = await api.bootstrap();
      serverUrl = api.baseUrl;
      await _configStore.writeServerUrl(api.baseUrl);
      _applyBootstrap(status);
    });
  }

  Future<void> changeServer() async {
    await _configStore.clearServerUrl();
    await _sessionStore.writeSessionCookie(null);
    serverUrl = null;
    sessionCookie = null;
    user = null;
    folders = const [];
    notes = const [];
    trashNotes = const [];
    templates = const [];
    selectedNote = null;
    selectedNoteIsTrash = false;
    phase = AppPhase.needsServer;
    notifyListeners();
  }

  Future<void> refreshBootstrap() async {
    await _run(() async {
      final status = await _requireApi().bootstrap();
      _applyBootstrap(status);
    });
  }

  Future<void> login(String email, String password) async {
    await _run(() async {
      user = await _requireApi().login(email: email, password: password);
      phase = AppPhase.signedIn;
      await loadWorkspace();
    });
  }

  Future<void> setup(String email, String displayName, String password) async {
    await _run(() async {
      user = await _requireApi().setup(
        email: email,
        displayName: displayName,
        password: password,
      );
      phase = AppPhase.signedIn;
      await loadWorkspace();
    });
  }

  Future<void> register(
    String email,
    String displayName,
    String password,
  ) async {
    await _run(() async {
      user = await _requireApi().register(
        email: email,
        displayName: displayName,
        password: password,
      );
      phase = AppPhase.signedIn;
      await loadWorkspace();
    });
  }

  Future<void> logout() async {
    await _run(() async {
      await _requireApi().logout();
      await _sessionStore.writeSessionCookie(null);
      sessionCookie = null;
      user = null;
      activeScope = NoteScope.personal;
      activeView = WorkspaceView.notes;
      selectedFolderId = null;
      searchQuery = '';
      selectedNote = null;
      selectedNoteIsTrash = false;
      selectedNoteConflict = false;
      notes = const [];
      trashNotes = const [];
      templates = const [];
      folders = const [];
      phase = AppPhase.needsLogin;
    });
  }

  Future<void> loadWorkspace() async {
    final api = _requireApi();
    folders = _sortFolders(await api.listFolders(scope: activeScope));
    notes = _sortNotes(await api.listNotes(scope: activeScope));
    trashNotes = await api.listTrashNotes(scope: activeScope);
    templates = await api.listTemplates();
    notifyListeners();
  }

  Future<void> refreshWorkspace({bool showBusy = true}) async {
    await _run(loadWorkspace, showBusy: showBusy);
  }

  Future<void> switchScope(NoteScope scope) async {
    if (activeScope == scope) {
      return;
    }

    activeScope = scope;
    activeView = WorkspaceView.notes;
    selectedFolderId = null;
    searchQuery = '';
    selectedNote = null;
    selectedNoteIsTrash = false;
    selectedNoteConflict = false;
    await _run(loadWorkspace);
  }

  void selectFolder(String? folderId) {
    selectedFolderId = folderId;
    activeView = WorkspaceView.notes;
    notifyListeners();
  }

  void setWorkspaceView(WorkspaceView view) {
    activeView = view;
    if (view != WorkspaceView.notes) {
      selectedFolderId = null;
    }
    notifyListeners();
  }

  void setSearchQuery(String value) {
    searchQuery = value;
    notifyListeners();
  }

  Future<void> createNote() async {
    await _run(() async {
      final note = await _requireApi().createNote(
        folderId: selectedFolderId,
        scope: activeScope,
      );
      _upsertNote(note);
      selectedNote = note;
      selectedNoteIsTrash = false;
      selectedNoteConflict = false;
    });
  }

  Future<void> createNoteFromTemplate(TemplateDto template) async {
    await _run(() async {
      final note = await _requireApi().createNote(
        folderId: selectedFolderId,
        templateId: template.id,
        scope: activeScope,
      );
      _upsertNote(note);
      selectedNote = note;
      selectedNoteIsTrash = false;
      selectedNoteConflict = false;
    });
  }

  Future<void> createTemplateFromSelectedNote(String name) async {
    final note = selectedNote;
    if (note == null || selectedNoteIsTrash) {
      return;
    }

    await _run(() async {
      final template = await _requireApi().createTemplateFromNote(
        note,
        name: name,
      );
      templates = [...templates, template]
        ..sort((a, b) {
          if (a.builtIn != b.builtIn) {
            return a.builtIn ? -1 : 1;
          }
          return a.name.compareTo(b.name);
        });
    }, showBusy: false);
  }

  Future<void> createFolder(String name, {String? parentFolderId}) async {
    await _run(() async {
      final folder = await _requireApi().createFolder(
        name: name,
        parentFolderId: parentFolderId ?? selectedFolderId,
        scope: activeScope,
      );
      folders = _sortFolders([...folders, folder]);
      selectedFolderId = folder.id;
    });
  }

  Future<void> renameSelectedFolder(String name) async {
    final folder = selectedFolder;
    if (folder == null) {
      return;
    }

    await _run(() async {
      final updated = await _requireApi().updateFolder(folder, name: name);
      folders = _sortFolders(
        folders
            .map((entry) => entry.id == updated.id ? updated : entry)
            .toList(growable: false),
      );
    });
  }

  Future<void> moveFolder(FolderDto folder, String? parentFolderId) async {
    await _run(() async {
      final updated = await _requireApi().updateFolder(
        folder,
        parentFolderId: parentFolderId,
      );
      folders = _sortFolders(
        folders
            .map((entry) => entry.id == updated.id ? updated : entry)
            .toList(growable: false),
      );
      selectedFolderId = updated.id;
    });
  }

  Future<void> moveSelectedFolder(String? parentFolderId) async {
    final folder = selectedFolder;
    if (folder == null) {
      return;
    }

    await moveFolder(folder, parentFolderId);
  }

  Future<void> reorderSiblingFolders(
    String? parentFolderId,
    List<FolderDto> orderedFolders,
  ) async {
    if (orderedFolders.isEmpty) {
      return;
    }

    if (orderedFolders.any(
      (folder) => folder.parentFolderId != parentFolderId,
    )) {
      return;
    }

    final originalFolders = folders;
    final updatedById = <String, FolderDto>{};

    for (var index = 0; index < orderedFolders.length; index++) {
      final folder = orderedFolders[index];
      updatedById[folder.id] = folder.copyWith(sortOrder: (index + 1) * 10);
    }

    folders = _sortFolders(
      folders
          .map((folder) => updatedById[folder.id] ?? folder)
          .toList(growable: false),
    );
    errorMessage = null;
    notifyListeners();

    try {
      final api = _requireApi();
      for (final folder in updatedById.values) {
        await api.updateFolder(folder, sortOrder: folder.sortOrder);
      }
      folders = _sortFolders(await api.listFolders(scope: activeScope));
    } on ApiException catch (error) {
      folders = originalFolders;
      errorMessage = error.message;
    } catch (_) {
      folders = originalFolders;
      errorMessage =
          'Something went wrong. Check your server address and connection.';
    } finally {
      notifyListeners();
    }
  }

  Future<void> deleteSelectedFolder() async {
    final folder = selectedFolder;
    if (folder == null) {
      return;
    }

    await _run(() async {
      await _requireApi().deleteFolder(folder);
      selectedFolderId = null;
      await loadWorkspace();
    });
  }

  Future<void> openNote(NoteSummaryDto summary) async {
    await _run(() async {
      selectedNote = await _requireApi().getNote(
        summary.id,
        scope: summary.scope,
      );
      selectedNoteIsTrash = false;
      selectedNoteConflict = false;
    });
  }

  Future<void> openTrashNote(NoteSummaryDto summary) async {
    await _run(() async {
      selectedNote = await _requireApi().getNote(
        summary.id,
        scope: summary.scope,
        trash: true,
      );
      selectedNoteIsTrash = true;
      selectedNoteConflict = false;
    });
  }

  Future<SaveResult> saveSelectedNote({
    required String content,
    String? title,
  }) async {
    final note = selectedNote;
    if (note == null) {
      return SaveResult.failed;
    }

    errorMessage = null;
    notifyListeners();

    try {
      final updated = await _requireApi().updateNote(
        note,
        content: content,
        title: title,
      );
      _upsertNote(updated);
      if (selectedNote?.id == note.id) {
        selectedNote = updated;
        selectedNoteIsTrash = false;
        selectedNoteConflict = false;
      }
      notifyListeners();
      return SaveResult.saved;
    } on ApiException catch (error) {
      errorMessage = error.message;
      selectedNoteConflict = error.isConflict;
      notifyListeners();
      return error.isConflict ? SaveResult.conflict : SaveResult.failed;
    } catch (_) {
      errorMessage =
          'Something went wrong. Check your connection and try again.';
      notifyListeners();
      return SaveResult.failed;
    }
  }

  Future<void> reloadSelectedNote() async {
    final note = selectedNote;
    if (note == null) {
      return;
    }

    await _run(() async {
      selectedNote = await _requireApi().getNote(note.id, scope: note.scope);
      selectedNoteIsTrash = false;
      selectedNoteConflict = false;
    });
  }

  Future<void> moveSelectedNoteToFolder(String? folderId) async {
    final note = selectedNote;
    if (note == null) {
      return;
    }

    await _run(() async {
      final updated = await _requireApi().moveNoteToFolder(
        note,
        folderId: folderId,
      );
      selectedNote = updated;
      _upsertNote(updated);
    });
  }

  Future<void> reorderVisibleNotes(List<NoteSummaryDto> orderedNotes) async {
    final folderId = selectedFolderId;
    if (searchQuery.trim().isNotEmpty) {
      return;
    }

    final originalNotes = notes;
    final updatedById = <String, NoteSummaryDto>{};

    for (var index = 0; index < orderedNotes.length; index++) {
      final note = orderedNotes[index];
      if (note.folderId != folderId) {
        return;
      }
      updatedById[note.id] = note.copyWith(sortOrder: (index + 1) * 10);
    }

    notes = _sortNotes(
      notes.map((note) => updatedById[note.id] ?? note).toList(growable: false),
    );
    errorMessage = null;
    notifyListeners();

    try {
      final api = _requireApi();
      for (final note in updatedById.values) {
        await api.setNoteSortOrder(note, sortOrder: note.sortOrder);
      }
      notes = _sortNotes(await api.listNotes(scope: activeScope));
    } on ApiException catch (error) {
      notes = originalNotes;
      errorMessage = error.message;
    } catch (_) {
      notes = originalNotes;
      errorMessage =
          'Something went wrong. Check your server address and connection.';
    } finally {
      notifyListeners();
    }
  }

  Future<void> toggleSelectedNotePin() async {
    final note = selectedNote;
    if (note == null) {
      return;
    }

    await _run(() async {
      final updated = await _requireApi().setNotePinned(
        note,
        pinned: !note.pinned,
      );
      selectedNote = updated;
      _upsertNote(updated);
    }, showBusy: false);
  }

  Future<void> deleteSelectedNote() async {
    final note = selectedNote;
    if (note == null) {
      return;
    }

    await _run(() async {
      await _requireApi().deleteNote(note);
      selectedNote = null;
      selectedNoteIsTrash = false;
      selectedNoteConflict = false;
      notes = notes
          .where((entry) => entry.id != note.id)
          .toList(growable: false);
      trashNotes = await _requireApi().listTrashNotes(scope: activeScope);
    });
  }

  Future<void> restoreSelectedTrashNote() async {
    final note = selectedNote;
    if (note == null || !selectedNoteIsTrash) {
      return;
    }

    await _run(() async {
      final restored = await _requireApi().restoreNote(note);
      selectedNote = restored;
      selectedNoteIsTrash = false;
      trashNotes = trashNotes
          .where((entry) => entry.id != note.id)
          .toList(growable: false);
      _upsertNote(restored);
    });
  }

  Future<void> hardDeleteSelectedTrashNote() async {
    final note = selectedNote;
    if (note == null || !selectedNoteIsTrash) {
      return;
    }

    await _run(() async {
      await _requireApi().hardDeleteNote(note);
      selectedNote = null;
      selectedNoteIsTrash = false;
      trashNotes = trashNotes
          .where((entry) => entry.id != note.id)
          .toList(growable: false);
    });
  }

  void closeNote() {
    selectedNote = null;
    selectedNoteIsTrash = false;
    selectedNoteConflict = false;
    notifyListeners();
  }

  void clearError() {
    errorMessage = null;
    notifyListeners();
  }

  void _applyBootstrap(BootstrapStatus status) {
    user = status.user;

    if (!status.hasUsers) {
      phase = AppPhase.needsSetup;
      return;
    }

    if (status.user == null) {
      phase = AppPhase.needsLogin;
      return;
    }

    phase = AppPhase.signedIn;
  }

  void _upsertNote(NoteDetailDto note) {
    final summary = note.toSummary();
    final next = [...notes];
    final index = next.indexWhere((entry) => entry.id == note.id);

    if (index == -1) {
      next.insert(0, summary);
    } else {
      next[index] = summary;
    }

    notes = _sortNotes(next);
  }

  NotkaApiClient _requireApi() {
    final api = _api;
    if (api == null) {
      throw ApiException('Connect to your Notka server first.');
    }

    return api;
  }

  Future<void> _run(
    Future<void> Function() action, {
    bool showBusy = true,
  }) async {
    if (showBusy) {
      busy = true;
    }
    errorMessage = null;
    notifyListeners();

    try {
      await action();
    } on ApiException catch (error) {
      errorMessage = error.message;
    } catch (error) {
      errorMessage =
          'Something went wrong. Check your server address and connection.';
    } finally {
      busy = false;
      notifyListeners();
    }
  }
}

List<FolderDto> _sortFolders(List<FolderDto> folders) {
  return folders..sort((a, b) {
    final parentComparison = (a.parentFolderId ?? '').compareTo(
      b.parentFolderId ?? '',
    );
    if (parentComparison != 0) {
      return parentComparison;
    }

    final orderComparison = a.sortOrder.compareTo(b.sortOrder);
    return orderComparison == 0 ? a.name.compareTo(b.name) : orderComparison;
  });
}

List<NoteSummaryDto> _sortNotes(List<NoteSummaryDto> notes) {
  return notes..sort((a, b) {
    if (a.pinned != b.pinned) {
      return a.pinned ? -1 : 1;
    }

    final orderComparison = a.sortOrder.compareTo(b.sortOrder);
    if (orderComparison != 0) {
      return orderComparison;
    }

    final aDate = a.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    final bDate = b.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
    return bDate.compareTo(aDate);
  });
}
