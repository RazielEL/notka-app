import 'dart:async';

import 'package:flutter/material.dart';

import 'app_state.dart';
import 'models.dart';

class NotkaMobileApp extends StatefulWidget {
  const NotkaMobileApp({super.key});

  @override
  State<NotkaMobileApp> createState() => _NotkaMobileAppState();
}

class _NotkaMobileAppState extends State<NotkaMobileApp> {
  late final NotkaAppState appState;

  @override
  void initState() {
    super.initState();
    appState = NotkaAppState();
    unawaited(appState.initialize());
  }

  @override
  void dispose() {
    appState.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF136F63),
      brightness: Brightness.dark,
    );

    return MaterialApp(
      title: 'Notka',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: const Color(0xFF101417),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          filled: true,
        ),
      ),
      home: AnimatedBuilder(
        animation: appState,
        builder: (context, _) => _AppFrame(appState: appState),
      ),
    );
  }
}

class _AppFrame extends StatelessWidget {
  const _AppFrame({required this.appState});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    final child = switch (appState.phase) {
      AppPhase.booting => const _BootScreen(),
      AppPhase.needsServer => ServerConnectionScreen(appState: appState),
      AppPhase.needsSetup => AuthScreen(
        appState: appState,
        mode: AuthMode.setup,
      ),
      AppPhase.needsLogin => AuthScreen(
        appState: appState,
        mode: AuthMode.login,
      ),
      AppPhase.signedIn => WorkspaceScreen(appState: appState),
    };

    return Stack(children: [child, if (appState.busy) const _BusyOverlay()]);
  }
}

class _BootScreen extends StatelessWidget {
  const _BootScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(child: Center(child: CircularProgressIndicator())),
    );
  }
}

class ServerConnectionScreen extends StatefulWidget {
  const ServerConnectionScreen({required this.appState, super.key});

  final NotkaAppState appState;

  @override
  State<ServerConnectionScreen> createState() => _ServerConnectionScreenState();
}

class _ServerConnectionScreenState extends State<ServerConnectionScreen> {
  final controller = TextEditingController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 24),
            Text('Notka', style: Theme.of(context).textTheme.displaySmall),
            const SizedBox(height: 8),
            Text(
              'Connect this app to your self-hosted Notka server.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 28),
            _ErrorBanner(message: widget.appState.errorMessage),
            TextField(
              controller: controller,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.url],
              decoration: const InputDecoration(
                labelText: 'Server address',
                hintText: 'https://notka.example.com',
                prefixIcon: Icon(Icons.dns_outlined),
              ),
              onSubmitted: (_) => _connect(),
            ),
            const SizedBox(height: 12),
            Text(
              'For Android emulator against local Next dev use http://10.0.2.2:3000.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _connect,
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Connect'),
            ),
          ],
        ),
      ),
    );
  }

  void _connect() {
    FocusManager.instance.primaryFocus?.unfocus();
    unawaited(widget.appState.connectToServer(controller.text));
  }
}

enum AuthMode { login, setup, register }

class AuthScreen extends StatefulWidget {
  const AuthScreen({required this.appState, required this.mode, super.key});

  final NotkaAppState appState;
  final AuthMode mode;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final emailController = TextEditingController();
  final displayNameController = TextEditingController();
  final passwordController = TextEditingController();
  late AuthMode mode = widget.mode;

  bool get needsDisplayName =>
      mode == AuthMode.setup || mode == AuthMode.register;

  @override
  void dispose() {
    emailController.dispose();
    displayNameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final title = switch (mode) {
      AuthMode.login => 'Sign in',
      AuthMode.setup => 'Create admin account',
      AuthMode.register => 'Create account',
    };
    final action = switch (mode) {
      AuthMode.login => 'Sign in',
      AuthMode.setup => 'Finish setup',
      AuthMode.register => 'Create account',
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notka'),
        actions: [
          IconButton(
            tooltip: 'Change server',
            onPressed: () => unawaited(widget.appState.changeServer()),
            icon: const Icon(Icons.dns_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              widget.appState.serverUrl ?? '',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            _ErrorBanner(message: widget.appState.errorMessage),
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.alternate_email),
              ),
            ),
            if (needsDisplayName) ...[
              const SizedBox(height: 12),
              TextField(
                controller: displayNameController,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                decoration: const InputDecoration(
                  labelText: 'Display name',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: passwordController,
              obscureText: true,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(
                labelText: 'Password',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.login),
              label: Text(action),
            ),
            if (widget.mode == AuthMode.login) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => setState(() {
                  mode = mode == AuthMode.register
                      ? AuthMode.login
                      : AuthMode.register;
                  widget.appState.clearError();
                }),
                child: Text(
                  mode == AuthMode.register
                      ? 'Back to sign in'
                      : 'Register on this server',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _submit() {
    FocusManager.instance.primaryFocus?.unfocus();
    final email = emailController.text.trim();
    final displayName = displayNameController.text.trim();
    final password = passwordController.text;

    switch (mode) {
      case AuthMode.login:
        unawaited(widget.appState.login(email, password));
      case AuthMode.setup:
        unawaited(widget.appState.setup(email, displayName, password));
      case AuthMode.register:
        unawaited(widget.appState.register(email, displayName, password));
    }
  }
}

class WorkspaceScreen extends StatelessWidget {
  const WorkspaceScreen({required this.appState, super.key});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    final note = appState.selectedNote;
    final visibleNotes = appState.visibleNotes;
    final scheduledNotes = appState.scheduledNotes;
    final trashNotes = appState.visibleTrashNotes;

    if (note != null) {
      return NoteEditorScreen(
        appState: appState,
        note: note,
        isTrash: appState.selectedNoteIsTrash,
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          appState.activeScope == NoteScope.personal ? 'Personal' : 'Group',
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Templates',
            icon: const Icon(Icons.file_copy_outlined),
            onSelected: (templateId) {
              final template = appState.templates.firstWhere(
                (entry) => entry.id == templateId,
              );
              unawaited(appState.createNoteFromTemplate(template));
            },
            itemBuilder: (context) => [
              for (final template in appState.templates)
                PopupMenuItem(
                  value: template.id,
                  child: Row(
                    children: [
                      Icon(
                        template.builtIn
                            ? Icons.auto_awesome
                            : Icons.description_outlined,
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(_templateName(template))),
                    ],
                  ),
                ),
            ],
          ),
          IconButton(
            tooltip: 'New folder',
            onPressed: () => _createFolder(context),
            icon: const Icon(Icons.create_new_folder_outlined),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => unawaited(appState.loadWorkspace()),
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') {
                unawaited(appState.logout());
              }
              if (value == 'server') {
                unawaited(appState.changeServer());
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'server', child: Text('Change server')),
              PopupMenuItem(value: 'logout', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      floatingActionButton: appState.activeView == WorkspaceView.trash
          ? null
          : FloatingActionButton.extended(
              onPressed: () => unawaited(appState.createNote()),
              icon: const Icon(Icons.add),
              label: const Text('New note'),
            ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: appState.loadWorkspace,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 96),
            children: [
              _ErrorBanner(message: appState.errorMessage),
              SegmentedButton<NoteScope>(
                segments: const [
                  ButtonSegment(
                    value: NoteScope.personal,
                    icon: Icon(Icons.person_outline),
                    label: Text('Personal'),
                  ),
                  ButtonSegment(
                    value: NoteScope.group,
                    icon: Icon(Icons.group_outlined),
                    label: Text('Group'),
                  ),
                ],
                selected: {appState.activeScope},
                onSelectionChanged: (selection) {
                  unawaited(appState.switchScope(selection.first));
                },
              ),
              const SizedBox(height: 12),
              SegmentedButton<WorkspaceView>(
                segments: const [
                  ButtonSegment(
                    value: WorkspaceView.notes,
                    icon: Icon(Icons.notes_outlined),
                    label: Text('Notes'),
                  ),
                  ButtonSegment(
                    value: WorkspaceView.schedule,
                    icon: Icon(Icons.event_outlined),
                    label: Text('Schedule'),
                  ),
                  ButtonSegment(
                    value: WorkspaceView.trash,
                    icon: Icon(Icons.delete_outline),
                    label: Text('Trash'),
                  ),
                ],
                selected: {appState.activeView},
                onSelectionChanged: (selection) {
                  appState.setWorkspaceView(selection.first);
                },
              ),
              const SizedBox(height: 12),
              if (appState.activeView == WorkspaceView.notes) ...[
                _FolderFilterBar(appState: appState),
                if (appState.selectedFolder != null) ...[
                  const SizedBox(height: 8),
                  _SelectedFolderActions(appState: appState),
                ],
                const SizedBox(height: 12),
              ],
              if (appState.activeView == WorkspaceView.schedule)
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                  child: Text(
                    'Notes with alert or calendar date',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              if (appState.activeView == WorkspaceView.trash)
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                  child: Text(
                    'Deleted notes',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              TextField(
                onChanged: appState.setSearchQuery,
                decoration: const InputDecoration(
                  labelText: 'Search notes',
                  prefixIcon: Icon(Icons.search),
                ),
              ),
              const SizedBox(height: 12),
              if (appState.user != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                  child: Text(
                    '${appState.user!.displayName}  |  ${appState.serverUrl}',
                    style: Theme.of(context).textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              if (appState.activeView == WorkspaceView.schedule)
                if (scheduledNotes.isEmpty)
                  const _EmptySchedule()
                else
                  for (final note in scheduledNotes)
                    _NoteTile(
                      note: note,
                      folderName: _folderName(appState.folders, note.folderId),
                      onTap: () => unawaited(appState.openNote(note)),
                    )
              else if (appState.activeView == WorkspaceView.trash)
                if (trashNotes.isEmpty)
                  const _EmptyTrash()
                else
                  for (final note in trashNotes)
                    _NoteTile(
                      note: note,
                      folderName: _folderName(appState.folders, note.folderId),
                      onTap: () => unawaited(appState.openTrashNote(note)),
                    )
              else if (visibleNotes.isEmpty)
                const _EmptyNotes()
              else
                for (final note in visibleNotes)
                  _NoteTile(
                    note: note,
                    folderName: _folderName(appState.folders, note.folderId),
                    onTap: () => unawaited(appState.openNote(note)),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _createFolder(BuildContext context) async {
    final nameController = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New folder'),
        content: TextField(
          controller: nameController,
          autofocus: true,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(labelText: 'Folder name'),
          onSubmitted: (value) => Navigator.of(context).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(nameController.text),
            child: const Text('Create'),
          ),
        ],
      ),
    );
    nameController.dispose();

    if (name != null && name.trim().isNotEmpty) {
      unawaited(appState.createFolder(name.trim()));
    }
  }

  static String? _folderName(List<FolderDto> folders, String? folderId) {
    if (folderId == null) {
      return null;
    }

    for (final folder in folders) {
      if (folder.id == folderId) {
        return folder.name;
      }
    }

    return null;
  }
}

class _FolderFilterBar extends StatelessWidget {
  const _FolderFilterBar({required this.appState});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              selected: appState.selectedFolderId == null,
              label: const Text('All notes'),
              avatar: const Icon(Icons.all_inbox_outlined),
              onSelected: (_) => appState.selectFolder(null),
            ),
          ),
          for (final folder in appState.folders)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                selected: appState.selectedFolderId == folder.id,
                label: Text(folder.name),
                avatar: const Icon(Icons.folder_outlined),
                onSelected: (_) => appState.selectFolder(folder.id),
              ),
            ),
        ],
      ),
    );
  }
}

class _SelectedFolderActions extends StatelessWidget {
  const _SelectedFolderActions({required this.appState});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    final folder = appState.selectedFolder;
    if (folder == null) {
      return const SizedBox.shrink();
    }

    return Row(
      children: [
        Expanded(
          child: Text(
            folder.parentFolderId == null
                ? folder.name
                : 'Child folder: ${folder.name}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        IconButton(
          tooltip: 'Rename folder',
          onPressed: () => _renameFolder(context, folder.name),
          icon: const Icon(Icons.drive_file_rename_outline),
        ),
        IconButton(
          tooltip: 'Move folder to root',
          onPressed: folder.parentFolderId == null
              ? null
              : () => unawaited(appState.moveSelectedFolderToRoot()),
          icon: const Icon(Icons.vertical_align_top),
        ),
        IconButton(
          tooltip: 'Delete folder',
          onPressed: () => _deleteFolder(context, folder.name),
          icon: const Icon(Icons.delete_outline),
        ),
      ],
    );
  }

  Future<void> _renameFolder(BuildContext context, String currentName) async {
    final controller = TextEditingController(text: currentName);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename folder'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(labelText: 'Folder name'),
          onSubmitted: (value) => Navigator.of(context).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Rename'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (name != null && name.trim().isNotEmpty) {
      unawaited(appState.renameSelectedFolder(name.trim()));
    }
  }

  Future<void> _deleteFolder(BuildContext context, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete $name?'),
        content: const Text('Notes in this folder will be moved to All notes.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      unawaited(appState.deleteSelectedFolder());
    }
  }
}

class _EmptyNotes extends StatelessWidget {
  const _EmptyNotes();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 96, horizontal: 24),
      child: Column(
        children: [
          Icon(
            Icons.note_add_outlined,
            size: 52,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 12),
          Text('No notes yet', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(
            'Create your first mobile note from the button below.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _EmptySchedule extends StatelessWidget {
  const _EmptySchedule();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 96, horizontal: 24),
      child: Column(
        children: [
          Icon(
            Icons.event_available_outlined,
            size: 52,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 12),
          Text(
            'No scheduled notes',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Add an alert or calendar date from a note editor.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _EmptyTrash extends StatelessWidget {
  const _EmptyTrash();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 96, horizontal: 24),
      child: Column(
        children: [
          Icon(
            Icons.delete_sweep_outlined,
            size: 52,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 12),
          Text(
            'Trash is empty',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 6),
          Text(
            'Deleted notes will appear here.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

class _NoteTile extends StatelessWidget {
  const _NoteTile({required this.note, required this.onTap, this.folderName});

  final NoteSummaryDto note;
  final String? folderName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final schedule = _scheduleSubtitle(note);
    final subtitle = [
      if (folderName != null) folderName,
      ?schedule,
      if (note.excerpt != null && note.excerpt!.trim().isNotEmpty) note.excerpt,
    ].join('  |  ');

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 5),
      child: ListTile(
        onTap: onTap,
        leading: Icon(note.pinned ? Icons.push_pin : Icons.notes_outlined),
        title: Text(note.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: subtitle.isEmpty
            ? null
            : Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

class NoteEditorScreen extends StatefulWidget {
  const NoteEditorScreen({
    required this.appState,
    required this.note,
    required this.isTrash,
    super.key,
  });

  final NotkaAppState appState;
  final NoteDetailDto note;
  final bool isTrash;

  @override
  State<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<NoteEditorScreen> {
  late final TextEditingController titleController;
  late final TextEditingController contentController;
  Timer? saveTimer;
  String saveStatus = 'Saved';
  bool titleDirty = false;
  _EditorMode editorMode = _EditorMode.markdown;

  @override
  void initState() {
    super.initState();
    titleController = TextEditingController(text: widget.note.title);
    contentController = TextEditingController(text: widget.note.content);
  }

  @override
  void didUpdateWidget(covariant NoteEditorScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.note.id != widget.note.id) {
      titleController.text = widget.note.title;
      contentController.text = widget.note.content;
      saveStatus = 'Saved';
      titleDirty = false;
    }
  }

  @override
  void dispose() {
    saveTimer?.cancel();
    titleController.dispose();
    contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final checklist = _parseChecklist(contentController.text);
    final effectiveEditorMode =
        editorMode == _EditorMode.checklist && checklist == null
        ? _EditorMode.markdown
        : editorMode;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          if (!widget.isTrash) {
            _flushSave();
          }
          widget.appState.closeNote();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            tooltip: 'Back',
            onPressed: () {
              if (!widget.isTrash) {
                _flushSave();
              }
              widget.appState.closeNote();
            },
            icon: const Icon(Icons.arrow_back),
          ),
          title: Text(widget.isTrash ? 'Trash' : saveStatus),
          actions: widget.isTrash
              ? [
                  IconButton(
                    tooltip: 'Restore',
                    onPressed: () =>
                        unawaited(widget.appState.restoreSelectedTrashNote()),
                    icon: const Icon(Icons.restore_from_trash_outlined),
                  ),
                  IconButton(
                    tooltip: 'Delete forever',
                    onPressed: _deleteForever,
                    icon: const Icon(Icons.delete_forever_outlined),
                  ),
                ]
              : [
                  IconButton(
                    tooltip: 'Save as template',
                    onPressed: _createTemplate,
                    icon: const Icon(Icons.note_add_outlined),
                  ),
                  IconButton(
                    tooltip: widget.note.pinned ? 'Unpin' : 'Pin',
                    onPressed: () =>
                        unawaited(widget.appState.toggleSelectedNotePin()),
                    icon: Icon(
                      widget.note.pinned
                          ? Icons.push_pin
                          : Icons.push_pin_outlined,
                    ),
                  ),
                  PopupMenuButton<String>(
                    tooltip: 'Move to folder',
                    icon: const Icon(Icons.folder_open_outlined),
                    onSelected: _moveToFolder,
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: '__root__',
                        child: Text('All notes'),
                      ),
                      for (final folder in widget.appState.folders)
                        PopupMenuItem(
                          value: folder.id,
                          child: Text(folder.name),
                        ),
                    ],
                  ),
                  IconButton(
                    tooltip: 'Save',
                    onPressed: _flushSave,
                    icon: const Icon(Icons.save_outlined),
                  ),
                  IconButton(
                    tooltip: 'Delete',
                    onPressed: _delete,
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              _ErrorBanner(message: widget.appState.errorMessage),
              if (widget.appState.selectedNoteConflict)
                _ConflictBanner(onReload: _reloadServerVersion),
              TextField(
                controller: titleController,
                enabled: !widget.isTrash,
                textInputAction: TextInputAction.next,
                style: Theme.of(context).textTheme.headlineSmall,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  prefixIcon: Icon(Icons.title),
                ),
                onChanged: (_) {
                  titleDirty = true;
                  final checklist = _parseChecklist(contentController.text);
                  if (checklist != null) {
                    contentController.text = checklist.toMarkdown(
                      titleController.text.trim().isEmpty
                          ? 'Checklist'
                          : titleController.text.trim(),
                    );
                  }
                  _scheduleSave();
                },
              ),
              if (widget.isTrash)
                _TrashNotice(
                  onRestore: () =>
                      unawaited(widget.appState.restoreSelectedTrashNote()),
                  onDeleteForever: _deleteForever,
                )
              else ...[
                const SizedBox(height: 12),
                _SchedulePanel(
                  note: widget.note,
                  onSetAlert: _setAlert,
                  onClearAlert: () =>
                      unawaited(widget.appState.setSelectedNoteAlert(null)),
                  onSetCalendar: _setCalendar,
                  onClearCalendar: () =>
                      unawaited(widget.appState.setSelectedNoteCalendar(null)),
                ),
              ],
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: SegmentedButton<_EditorMode>(
                  segments: [
                    ButtonSegment(
                      value: _EditorMode.markdown,
                      icon: Icon(Icons.edit_outlined),
                      label: Text('Edit'),
                    ),
                    if (checklist != null)
                      ButtonSegment(
                        value: _EditorMode.checklist,
                        icon: Icon(Icons.check_box_outlined),
                        label: Text('Checklist'),
                      ),
                    const ButtonSegment(
                      value: _EditorMode.preview,
                      icon: Icon(Icons.visibility_outlined),
                      label: Text('Preview'),
                    ),
                  ],
                  selected: {effectiveEditorMode},
                  onSelectionChanged: (selection) {
                    setState(() => editorMode = selection.first);
                  },
                ),
              ),
              const SizedBox(height: 12),
              if (effectiveEditorMode == _EditorMode.preview)
                _MarkdownPreview(content: contentController.text)
              else if (effectiveEditorMode == _EditorMode.checklist &&
                  checklist != null)
                _ChecklistEditor(
                  data: checklist,
                  readOnly: widget.isTrash,
                  onChanged: _updateChecklist,
                )
              else
                TextField(
                  controller: contentController,
                  enabled: !widget.isTrash,
                  minLines: 18,
                  maxLines: null,
                  keyboardType: TextInputType.multiline,
                  textInputAction: TextInputAction.newline,
                  decoration: const InputDecoration(
                    alignLabelWithHint: true,
                    labelText: 'Markdown',
                    prefixIcon: Padding(
                      padding: EdgeInsets.only(bottom: 324),
                      child: Icon(Icons.edit_note),
                    ),
                  ),
                  onChanged: (_) => _scheduleSave(),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _scheduleSave() {
    if (widget.isTrash) {
      return;
    }

    if (widget.appState.selectedNoteConflict) {
      setState(() => saveStatus = 'Conflict');
      return;
    }

    saveTimer?.cancel();
    setState(() => saveStatus = 'Unsaved');
    saveTimer = Timer(const Duration(milliseconds: 900), _flushSave);
  }

  void _updateChecklist(_ChecklistData data) {
    contentController.text = data.toMarkdown(
      titleController.text.trim().isEmpty
          ? 'Checklist'
          : titleController.text.trim(),
    );
    _scheduleSave();
  }

  void _flushSave() {
    if (widget.isTrash) {
      return;
    }

    if (widget.appState.selectedNoteConflict) {
      setState(() => saveStatus = 'Conflict');
      return;
    }

    saveTimer?.cancel();
    setState(() => saveStatus = 'Saving...');
    unawaited(_saveNow());
  }

  Future<void> _saveNow() async {
    final result = await widget.appState.saveSelectedNote(
      content: contentController.text,
      title: titleDirty
          ? titleController.text.trim().isEmpty
                ? 'Untitled note'
                : titleController.text.trim()
          : null,
    );

    if (!mounted) {
      return;
    }

    setState(() {
      saveStatus = switch (result) {
        SaveResult.saved => 'Saved',
        SaveResult.conflict => 'Conflict',
        SaveResult.failed => 'Unsaved',
      };
      if (result == SaveResult.saved) {
        titleDirty = false;
      }
    });
  }

  void _moveToFolder(String value) {
    _flushSave();
    unawaited(
      widget.appState.moveSelectedNoteToFolder(
        value == '__root__' ? null : value,
      ),
    );
  }

  Future<void> _reloadServerVersion() async {
    await widget.appState.reloadSelectedNote();
    final note = widget.appState.selectedNote;

    if (!mounted || note == null) {
      return;
    }

    setState(() {
      titleController.text = note.title;
      contentController.text = note.content;
      saveStatus = 'Saved';
      titleDirty = false;
    });
  }

  Future<void> _setAlert() async {
    final value = await _pickDateTime(
      context,
      initial:
          widget.note.alertAt ?? DateTime.now().add(const Duration(hours: 1)),
    );

    if (value != null) {
      unawaited(widget.appState.setSelectedNoteAlert(value));
    }
  }

  Future<void> _setCalendar() async {
    final value = await _pickDateTime(
      context,
      initial: widget.note.calendarAt ?? DateTime.now(),
    );

    if (value != null) {
      unawaited(widget.appState.setSelectedNoteCalendar(value));
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Move note to trash?'),
        content: const Text(
          'The note can still be managed from the web trash view.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      unawaited(widget.appState.deleteSelectedNote());
    }
  }

  Future<void> _createTemplate() async {
    final controller = TextEditingController(
      text:
          '${titleController.text.trim().isEmpty ? 'Note' : titleController.text.trim()} template',
    );
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Save as template'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(labelText: 'Template name'),
          onSubmitted: (value) => Navigator.of(context).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (name != null && name.trim().isNotEmpty) {
      final result = await widget.appState.saveSelectedNote(
        content: contentController.text,
        title: titleDirty
            ? titleController.text.trim().isEmpty
                  ? 'Untitled note'
                  : titleController.text.trim()
            : null,
      );

      if (!mounted || result != SaveResult.saved) {
        setState(() {
          saveStatus = result == SaveResult.conflict ? 'Conflict' : 'Unsaved';
        });
        return;
      }

      setState(() {
        titleDirty = false;
        saveStatus = 'Saved';
      });
      unawaited(widget.appState.createTemplateFromSelectedNote(name.trim()));
    }
  }

  Future<void> _deleteForever() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete forever?'),
        content: const Text(
          'This permanently removes the note and its Markdown file.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete forever'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      unawaited(widget.appState.hardDeleteSelectedTrashNote());
    }
  }
}

class _TrashNotice extends StatelessWidget {
  const _TrashNotice({required this.onRestore, required this.onDeleteForever});

  final VoidCallback onRestore;
  final VoidCallback onDeleteForever;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.delete_outline),
          const SizedBox(width: 10),
          const Expanded(child: Text('This note is in trash.')),
          TextButton(onPressed: onRestore, child: const Text('Restore')),
          IconButton(
            tooltip: 'Delete forever',
            onPressed: onDeleteForever,
            icon: const Icon(Icons.delete_forever_outlined),
          ),
        ],
      ),
    );
  }
}

class _SchedulePanel extends StatelessWidget {
  const _SchedulePanel({
    required this.note,
    required this.onSetAlert,
    required this.onClearAlert,
    required this.onSetCalendar,
    required this.onClearCalendar,
  });

  final NoteDetailDto note;
  final VoidCallback onSetAlert;
  final VoidCallback onClearAlert;
  final VoidCallback onSetCalendar;
  final VoidCallback onClearCalendar;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          _ScheduleRow(
            icon: Icons.notifications_active_outlined,
            label: 'Alert',
            value: _formatDateTime(note.alertAt),
            onSet: onSetAlert,
            onClear: note.alertAt == null ? null : onClearAlert,
          ),
          const Divider(height: 16),
          _ScheduleRow(
            icon: Icons.event_outlined,
            label: 'Calendar',
            value: _formatDateTime(note.calendarAt),
            onSet: onSetCalendar,
            onClear: note.calendarAt == null ? null : onClearCalendar,
          ),
        ],
      ),
    );
  }
}

class _ScheduleRow extends StatelessWidget {
  const _ScheduleRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onSet,
    required this.onClear,
  });

  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback onSet;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.labelLarge),
              Text(
                value ?? 'Not set',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Set $label',
          onPressed: onSet,
          icon: const Icon(Icons.edit_calendar_outlined),
        ),
        IconButton(
          tooltip: 'Clear $label',
          onPressed: onClear,
          icon: const Icon(Icons.close),
        ),
      ],
    );
  }
}

Future<DateTime?> _pickDateTime(
  BuildContext context, {
  required DateTime initial,
}) async {
  final localInitial = initial.toLocal();
  final now = DateTime.now();
  final date = await showDatePicker(
    context: context,
    initialDate: localInitial,
    firstDate: DateTime(now.year - 1),
    lastDate: DateTime(now.year + 10),
  );

  if (date == null || !context.mounted) {
    return null;
  }

  final time = await showTimePicker(
    context: context,
    initialTime: TimeOfDay.fromDateTime(localInitial),
  );

  if (time == null) {
    return null;
  }

  return DateTime(date.year, date.month, date.day, time.hour, time.minute);
}

String? _scheduleSubtitle(NoteSummaryDto note) {
  final parts = [
    if (note.alertAt != null) 'Alert ${_formatDateTime(note.alertAt)}',
    if (note.calendarAt != null) 'Calendar ${_formatDateTime(note.calendarAt)}',
  ];

  return parts.isEmpty ? null : parts.join(' / ');
}

String? _formatDateTime(DateTime? value) {
  if (value == null) {
    return null;
  }

  final local = value.toLocal();
  final date =
      '${local.year}-${_pad2(local.month)}-${_pad2(local.day)} ${_pad2(local.hour)}:${_pad2(local.minute)}';
  return date;
}

String _pad2(int value) => value.toString().padLeft(2, '0');

String _templateName(TemplateDto template) {
  return switch (template.id) {
    'blank' => 'Blank note',
    'checklist' => 'Checklist',
    'table' => 'Table',
    'daily' => 'Daily note',
    _ => template.name,
  };
}

enum _EditorMode { markdown, checklist, preview }

const _checklistMarker = '<!-- notka:type=checklist -->';

class _ChecklistItemData {
  _ChecklistItemData({required this.checked, required this.text});

  bool checked;
  String text;

  _ChecklistItemData copy() {
    return _ChecklistItemData(checked: checked, text: text);
  }
}

class _ChecklistCategoryData {
  _ChecklistCategoryData({required this.name, required this.items});

  String name;
  List<_ChecklistItemData> items;

  _ChecklistCategoryData copy() {
    return _ChecklistCategoryData(
      name: name,
      items: items.map((item) => item.copy()).toList(growable: true),
    );
  }
}

class _ChecklistData {
  _ChecklistData({required this.title, required this.categories});

  String title;
  List<_ChecklistCategoryData> categories;

  _ChecklistData copy() {
    return _ChecklistData(
      title: title,
      categories: categories
          .map((category) => category.copy())
          .toList(growable: true),
    );
  }

  String toMarkdown(String fallbackTitle) {
    final safeTitle = _cleanChecklistTitle(fallbackTitle, 'Checklist');
    final safeCategories = categories.isEmpty
        ? [
            _ChecklistCategoryData(
              name: 'Checklist',
              items: [_ChecklistItemData(checked: false, text: '')],
            ),
          ]
        : categories;
    final body = safeCategories
        .map((category) {
          final heading =
              '## ${_cleanChecklistTitle(category.name, 'Checklist')}';
          final items = category.items.isEmpty
              ? ['- [ ] ']
              : category.items
                    .map(
                      (item) =>
                          '- [${item.checked ? 'x' : ' '}] ${item.text.replaceAll('\n', ' ')}',
                    )
                    .toList(growable: false);
          return [heading, ...items].join('\n');
        })
        .join('\n\n');

    return '$_checklistMarker\n# $safeTitle\n\n$body\n';
  }
}

_ChecklistData? _parseChecklist(String content) {
  final normalized = content.replaceAll('\r\n', '\n');
  final pureChecklist = _isPureChecklist(normalized);

  if (!normalized.contains(_checklistMarker) && !pureChecklist) {
    return null;
  }

  final title =
      normalized
          .split('\n')
          .map((line) => line.trim())
          .firstWhere(
            (line) => line.startsWith('# '),
            orElse: () => '# Checklist',
          )
          .replaceFirst(RegExp(r'^#\s+'), '')
          .trim()
          .isEmpty
      ? 'Checklist'
      : normalized
            .split('\n')
            .map((line) => line.trim())
            .firstWhere(
              (line) => line.startsWith('# '),
              orElse: () => '# Checklist',
            )
            .replaceFirst(RegExp(r'^#\s+'), '')
            .trim();
  final categories = <_ChecklistCategoryData>[];
  _ChecklistCategoryData? current;

  for (final line in normalized.split('\n')) {
    final heading = RegExp(r'^##\s+(.+)$').firstMatch(line.trim());
    if (heading != null) {
      current = _ChecklistCategoryData(
        name: heading.group(1)?.trim() ?? 'Checklist',
        items: [],
      );
      categories.add(current);
      continue;
    }

    final item = RegExp(r'^\s*[-*]\s+\[([ xX])\]\s?(.*)$').firstMatch(line);
    if (item == null) {
      continue;
    }

    current ??= _ChecklistCategoryData(name: 'Checklist', items: []);
    if (!categories.contains(current)) {
      categories.add(current);
    }
    current.items.add(
      _ChecklistItemData(
        checked: item.group(1)?.toLowerCase() == 'x',
        text: item.group(2) ?? '',
      ),
    );
  }

  if (categories.isEmpty) {
    categories.add(
      _ChecklistCategoryData(
        name: 'Checklist',
        items: [_ChecklistItemData(checked: false, text: '')],
      ),
    );
  }

  return _ChecklistData(title: title, categories: categories);
}

bool _isPureChecklist(String content) {
  final lines = content
      .split('\n')
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty && !line.startsWith('<!--'))
      .toList(growable: false);

  if (lines.length < 2 || !lines.first.startsWith('# ')) {
    return false;
  }

  return lines
      .skip(1)
      .every((line) => RegExp(r'^[-*]\s+\[[ xX]\]\s*').hasMatch(line));
}

String _cleanChecklistTitle(String value, String fallback) {
  final cleaned = value.replaceAll(RegExp(r'\s+'), ' ').trim();
  return cleaned.isEmpty ? fallback : cleaned;
}

class _ChecklistEditor extends StatelessWidget {
  const _ChecklistEditor({
    required this.data,
    required this.readOnly,
    required this.onChanged,
  });

  final _ChecklistData data;
  final bool readOnly;
  final ValueChanged<_ChecklistData> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (
          var categoryIndex = 0;
          categoryIndex < data.categories.length;
          categoryIndex++
        )
          _ChecklistCategoryEditor(
            data: data,
            categoryIndex: categoryIndex,
            readOnly: readOnly,
            onChanged: onChanged,
          ),
        if (!readOnly)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () {
                final next = data.copy();
                next.categories.add(
                  _ChecklistCategoryData(
                    name: 'Category ${next.categories.length + 1}',
                    items: [_ChecklistItemData(checked: false, text: '')],
                  ),
                );
                onChanged(next);
              },
              icon: const Icon(Icons.playlist_add),
              label: const Text('Add category'),
            ),
          ),
      ],
    );
  }
}

class _ChecklistCategoryEditor extends StatelessWidget {
  const _ChecklistCategoryEditor({
    required this.data,
    required this.categoryIndex,
    required this.readOnly,
    required this.onChanged,
  });

  final _ChecklistData data;
  final int categoryIndex;
  final bool readOnly;
  final ValueChanged<_ChecklistData> onChanged;

  @override
  Widget build(BuildContext context) {
    final category = data.categories[categoryIndex];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextFormField(
              key: ValueKey('category-$categoryIndex-${category.name}'),
              initialValue: category.name,
              enabled: !readOnly,
              decoration: const InputDecoration(
                labelText: 'Category',
                prefixIcon: Icon(Icons.label_outline),
              ),
              onChanged: (value) {
                final next = data.copy();
                next.categories[categoryIndex].name = value;
                onChanged(next);
              },
            ),
            const SizedBox(height: 8),
            for (
              var itemIndex = 0;
              itemIndex < category.items.length;
              itemIndex++
            )
              _ChecklistItemEditor(
                data: data,
                categoryIndex: categoryIndex,
                itemIndex: itemIndex,
                readOnly: readOnly,
                onChanged: onChanged,
              ),
            if (!readOnly)
              Row(
                children: [
                  TextButton.icon(
                    onPressed: () {
                      final next = data.copy();
                      next.categories[categoryIndex].items.add(
                        _ChecklistItemData(checked: false, text: ''),
                      );
                      onChanged(next);
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Add item'),
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: 'Delete category',
                    onPressed: data.categories.length == 1
                        ? null
                        : () {
                            final next = data.copy();
                            next.categories.removeAt(categoryIndex);
                            onChanged(next);
                          },
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _ChecklistItemEditor extends StatelessWidget {
  const _ChecklistItemEditor({
    required this.data,
    required this.categoryIndex,
    required this.itemIndex,
    required this.readOnly,
    required this.onChanged,
  });

  final _ChecklistData data;
  final int categoryIndex;
  final int itemIndex;
  final bool readOnly;
  final ValueChanged<_ChecklistData> onChanged;

  @override
  Widget build(BuildContext context) {
    final item = data.categories[categoryIndex].items[itemIndex];

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Checkbox(
            value: item.checked,
            onChanged: readOnly
                ? null
                : (value) {
                    final next = data.copy();
                    next.categories[categoryIndex].items[itemIndex].checked =
                        value ?? false;
                    onChanged(next);
                  },
          ),
          Expanded(
            child: TextFormField(
              key: ValueKey('item-$categoryIndex-$itemIndex-${item.text}'),
              initialValue: item.text,
              enabled: !readOnly,
              minLines: 1,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Item'),
              onChanged: (value) {
                final next = data.copy();
                next.categories[categoryIndex].items[itemIndex].text = value;
                onChanged(next);
              },
            ),
          ),
          if (!readOnly)
            IconButton(
              tooltip: 'Delete item',
              onPressed: () {
                final next = data.copy();
                final items = next.categories[categoryIndex].items;
                if (items.length == 1) {
                  items.first.text = '';
                  items.first.checked = false;
                } else {
                  items.removeAt(itemIndex);
                }
                onChanged(next);
              },
              icon: const Icon(Icons.close),
            ),
        ],
      ),
    );
  }
}

class _MarkdownPreview extends StatelessWidget {
  const _MarkdownPreview({required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    final lines = content.replaceAll('\r\n', '\n').split('\n');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [for (final line in lines) _PreviewLine(line: line)],
      ),
    );
  }
}

class _PreviewLine extends StatelessWidget {
  const _PreviewLine({required this.line});

  final String line;

  @override
  Widget build(BuildContext context) {
    final trimmed = line.trimRight();

    if (trimmed.trim().isEmpty) {
      return const SizedBox(height: 10);
    }

    if (trimmed.startsWith('# ')) {
      return _PreviewText(
        trimmed.substring(2),
        style: Theme.of(context).textTheme.headlineSmall,
      );
    }

    if (trimmed.startsWith('## ')) {
      return _PreviewText(
        trimmed.substring(3),
        style: Theme.of(context).textTheme.titleLarge,
      );
    }

    if (trimmed.startsWith('### ')) {
      return _PreviewText(
        trimmed.substring(4),
        style: Theme.of(context).textTheme.titleMedium,
      );
    }

    final checklistMatch = RegExp(
      r'^\s*[-*]\s+\[([ xX])\]\s?(.*)$',
    ).firstMatch(trimmed);
    if (checklistMatch != null) {
      final checked = checklistMatch.group(1)?.toLowerCase() == 'x';
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              checked ? Icons.check_box : Icons.check_box_outline_blank,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(checklistMatch.group(2) ?? '')),
          ],
        ),
      );
    }

    final bulletMatch = RegExp(r'^\s*[-*]\s+(.*)$').firstMatch(trimmed);
    if (bulletMatch != null) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('•'),
            const SizedBox(width: 10),
            Expanded(
              child: Text(_cleanInlineMarkdown(bulletMatch.group(1) ?? '')),
            ),
          ],
        ),
      );
    }

    return _PreviewText(trimmed);
  }
}

class _PreviewText extends StatelessWidget {
  const _PreviewText(this.text, {this.style});

  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(_cleanInlineMarkdown(text), style: style),
    );
  }
}

String _cleanInlineMarkdown(String value) {
  var cleaned = value;
  for (final pattern in [
    RegExp(r'`([^`]+)`'),
    RegExp(r'\*\*([^*]+)\*\*'),
    RegExp(r'\*([^*]+)\*'),
    RegExp(r'_([^_]+)_'),
    RegExp(r'\[([^\]]+)\]\([^)]+\)'),
  ]) {
    cleaned = cleaned.replaceAllMapped(
      pattern,
      (match) => match.group(1) ?? '',
    );
  }

  return cleaned;
}

class _ConflictBanner extends StatelessWidget {
  const _ConflictBanner({required this.onReload});

  final VoidCallback onReload;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Server version changed',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.onTertiaryContainer,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Reload the note before saving again.',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onTertiaryContainer,
            ),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: onReload,
            icon: const Icon(Icons.sync),
            label: const Text('Reload'),
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final value = message;

    if (value == null || value.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        value,
        style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
      ),
    );
  }
}

class _BusyOverlay extends StatelessWidget {
  const _BusyOverlay();

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black.withValues(alpha: 0.24),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}
