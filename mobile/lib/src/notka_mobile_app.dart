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
    final visibleNotes = appState.visibleNotes;
    final trashNotes = appState.visibleTrashNotes;
    final hasPinnedNotes =
        appState.activeView == WorkspaceView.notes &&
        visibleNotes.any((note) => note.pinned);
    final canReorderNotes =
        appState.activeView == WorkspaceView.notes &&
        appState.searchQuery.trim().isEmpty &&
        visibleNotes.isNotEmpty &&
        visibleNotes.every(
          (note) => note.folderId == appState.selectedFolderId,
        );

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
              unawaited(_createNoteFromTemplate(context, template));
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
            onPressed: () => _createFolder(context, appState),
            icon: const Icon(Icons.create_new_folder_outlined),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => unawaited(appState.refreshWorkspace()),
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Settings',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => _SettingsScreen(appState: appState),
              ),
            ),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      floatingActionButton: appState.activeView == WorkspaceView.trash
          ? null
          : FloatingActionButton.extended(
              onPressed: () => unawaited(_createNote(context)),
              icon: const Icon(Icons.add),
              label: const Text('New note'),
            ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => appState.refreshWorkspace(showBusy: false),
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
                _FolderTreePanel(appState: appState),
                const SizedBox(height: 12),
              ],
              if (appState.activeView == WorkspaceView.trash)
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                  child: Text(
                    'Deleted notes',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              if (appState.activeView == WorkspaceView.notes &&
                  appState.selectedFolder != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                  child: Text(
                    _folderPath(appState.folders, appState.selectedFolder!.id),
                    style: Theme.of(context).textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis,
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
              if (appState.activeView == WorkspaceView.trash)
                if (trashNotes.isEmpty)
                  const _EmptyTrash()
                else
                  for (final note in trashNotes)
                    _NoteTile(
                      note: note,
                      folderName: _folderName(appState.folders, note.folderId),
                      onTap: () => unawaited(_openTrashNote(context, note)),
                    )
              else if (visibleNotes.isEmpty)
                const _EmptyNotes()
              else if (hasPinnedNotes) ...[
                const _PinnedNotesHeader(),
                if (canReorderNotes)
                  _ReorderableNotesList(
                    notes: visibleNotes,
                    folders: appState.folders,
                    onOpen: (note) => unawaited(_openNote(context, note)),
                    onReorder: (ordered) =>
                        unawaited(appState.reorderVisibleNotes(ordered)),
                  )
                else
                  for (final note in visibleNotes)
                    _NoteTile(
                      note: note,
                      folderName: _folderName(appState.folders, note.folderId),
                      onTap: () => unawaited(_openNote(context, note)),
                    ),
              ] else if (canReorderNotes)
                _ReorderableNotesList(
                  notes: visibleNotes,
                  folders: appState.folders,
                  onOpen: (note) => unawaited(_openNote(context, note)),
                  onReorder: (ordered) =>
                      unawaited(appState.reorderVisibleNotes(ordered)),
                )
              else
                for (final note in visibleNotes)
                  _NoteTile(
                    note: note,
                    folderName: _folderName(appState.folders, note.folderId),
                    onTap: () => unawaited(_openNote(context, note)),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _createNote(BuildContext context) async {
    await appState.createNote();
    if (context.mounted) {
      await _pushSelectedNote(context);
    }
  }

  Future<void> _createNoteFromTemplate(
    BuildContext context,
    TemplateDto template,
  ) async {
    await appState.createNoteFromTemplate(template);
    if (context.mounted) {
      await _pushSelectedNote(context);
    }
  }

  Future<void> _openNote(BuildContext context, NoteSummaryDto note) async {
    await appState.openNote(note);
    if (context.mounted) {
      await _pushSelectedNote(context);
    }
  }

  Future<void> _openTrashNote(BuildContext context, NoteSummaryDto note) async {
    await appState.openTrashNote(note);
    if (context.mounted) {
      await _pushSelectedNote(context);
    }
  }

  Future<void> _pushSelectedNote(BuildContext context) async {
    await _pushSelectedNoteRoute(context, appState);
  }
}

Future<void> _pushSelectedNoteRoute(
  BuildContext context,
  NotkaAppState appState,
) async {
  if (appState.selectedNote == null) {
    return;
  }

  try {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => _NoteEditorRoute(appState: appState)),
    );
  } finally {
    appState.closeNote();
  }
}

class _ReorderableNotesList extends StatelessWidget {
  const _ReorderableNotesList({
    required this.notes,
    required this.folders,
    required this.onOpen,
    required this.onReorder,
  });

  final List<NoteSummaryDto> notes;
  final List<FolderDto> folders;
  final ValueChanged<NoteSummaryDto> onOpen;
  final ValueChanged<List<NoteSummaryDto>> onReorder;

  @override
  Widget build(BuildContext context) {
    return ReorderableListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: notes.length,
      onReorderItem: (oldIndex, newIndex) {
        final ordered = [...notes];
        final moved = ordered.removeAt(oldIndex);
        ordered.insert(newIndex, moved);
        onReorder(ordered);
      },
      itemBuilder: (context, index) {
        final note = notes[index];
        return _NoteTile(
          key: ValueKey('note-${note.id}'),
          note: note,
          folderName: _folderName(folders, note.folderId),
          reorderEnabled: true,
          onTap: () => onOpen(note),
        );
      },
    );
  }
}

class _SettingsScreen extends StatelessWidget {
  const _SettingsScreen({required this.appState});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: appState,
      builder: (context, _) {
        final user = appState.user;

        return Scaffold(
          appBar: AppBar(title: const Text('Settings')),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                if (appState.busy) const LinearProgressIndicator(),
                if (appState.busy) const SizedBox(height: 12),
                _ErrorBanner(message: appState.errorMessage),
                _SettingsSection(
                  title: 'Server',
                  children: [
                    ListTile(
                      leading: const Icon(Icons.dns_outlined),
                      title: const Text('Current server'),
                      subtitle: Text(appState.serverUrl ?? 'Not connected'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.sync),
                      title: const Text('Refresh data'),
                      subtitle: const Text('Pull latest notes and folders'),
                      onTap: () => _refreshData(context),
                    ),
                    ListTile(
                      leading: const Icon(Icons.swap_horiz),
                      title: const Text('Change server'),
                      subtitle: const Text(
                        'Clears the saved server and session',
                      ),
                      onTap: () => _changeServer(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _SettingsSection(
                  title: 'Account',
                  children: [
                    ListTile(
                      leading: const Icon(Icons.person_outline),
                      title: Text(user?.displayName ?? 'Signed in'),
                      subtitle: Text(user?.email ?? ''),
                    ),
                    ListTile(
                      leading: const Icon(Icons.logout),
                      title: const Text('Sign out'),
                      subtitle: const Text('Keep this server saved'),
                      onTap: () => _signOut(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _SettingsSection(
                  title: 'App',
                  children: const [
                    ListTile(
                      leading: Icon(Icons.phone_android),
                      title: Text('Notka Mobile'),
                      subtitle: Text('Self-hosted notes client'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _refreshData(BuildContext context) async {
    await appState.refreshWorkspace();

    if (!context.mounted) {
      return;
    }

    final message = appState.errorMessage == null
        ? 'Data refreshed'
        : 'Refresh failed';
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _changeServer(BuildContext context) async {
    final confirmed = await _confirmSettingsAction(
      context,
      title: 'Change server?',
      message: 'This clears the saved server and your current session.',
      actionLabel: 'Change',
    );

    if (confirmed != true) {
      return;
    }

    await appState.changeServer();

    if (context.mounted) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  Future<void> _signOut(BuildContext context) async {
    final confirmed = await _confirmSettingsAction(
      context,
      title: 'Sign out?',
      message: 'Your server address will stay saved on this device.',
      actionLabel: 'Sign out',
    );

    if (confirmed != true) {
      return;
    }

    await appState.logout();

    if (context.mounted && appState.phase != AppPhase.signedIn) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Text(title, style: Theme.of(context).textTheme.labelLarge),
          ),
          ...children,
        ],
      ),
    );
  }
}

Future<bool?> _confirmSettingsAction(
  BuildContext context, {
  required String title,
  required String message,
  required String actionLabel,
}) {
  return showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(actionLabel),
        ),
      ],
    ),
  );
}

class _FolderTreePanel extends StatelessWidget {
  const _FolderTreePanel({required this.appState});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    final entries = _folderTreeEntries(appState.folders);
    final selectedFolder = appState.selectedFolder;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          children: [
            ListTile(
              dense: true,
              leading: const Icon(Icons.all_inbox_outlined),
              selected: appState.selectedFolderId == null,
              title: const Text('All notes'),
              subtitle: const Text('Combined view'),
              trailing: IconButton(
                tooltip: 'Reorder root folders',
                onPressed: () =>
                    _reorderFolderSiblings(context, appState, null),
                icon: const Icon(Icons.swap_vert),
              ),
              onTap: () => appState.selectFolder(null),
            ),
            const Divider(height: 1),
            if (entries.isEmpty)
              ListTile(
                dense: true,
                leading: const Icon(Icons.folder_off_outlined),
                title: const Text('No folders yet'),
                subtitle: const Text('Use the folder button above.'),
                onTap: () => _createFolder(context, appState),
              ),
            for (final entry in entries)
              _FolderTreeTile(
                entry: entry,
                selected: selectedFolder?.id == entry.folder.id,
                folders: appState.folders,
                onSelect: () =>
                    unawaited(_openFolder(context, appState, entry.folder.id)),
                onAction: (action) => _handleFolderAction(
                  context,
                  appState,
                  entry.folder,
                  action,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

Future<void> _openFolder(
  BuildContext context,
  NotkaAppState appState,
  String folderId,
) async {
  final previousFolderId = appState.selectedFolderId;
  appState.selectFolder(folderId);

  try {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            _FolderNotesScreen(appState: appState, folderId: folderId),
      ),
    );
  } finally {
    if (context.mounted && appState.selectedFolderId == folderId) {
      appState.selectFolder(previousFolderId);
    }
  }
}

class _FolderNotesScreen extends StatelessWidget {
  const _FolderNotesScreen({required this.appState, required this.folderId});

  final NotkaAppState appState;
  final String folderId;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: appState,
      builder: (context, _) {
        FolderDto? folder;
        for (final entry in appState.folders) {
          if (entry.id == folderId) {
            folder = entry;
            break;
          }
        }
        final visibleNotes = appState.visibleNotes;
        final hasPinnedNotes = visibleNotes.any((note) => note.pinned);
        final canReorderNotes =
            appState.searchQuery.trim().isEmpty &&
            visibleNotes.isNotEmpty &&
            visibleNotes.every((note) => note.folderId == folderId);

        return Scaffold(
          appBar: AppBar(
            title: Text(folder?.name ?? 'Folder'),
            leading: IconButton(
              tooltip: 'Back',
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back),
            ),
            actions: [
              IconButton(
                tooltip: 'New note',
                onPressed: () => unawaited(_createNote(context)),
                icon: const Icon(Icons.add),
              ),
            ],
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => appState.refreshWorkspace(showBusy: false),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 96),
                children: [
                  _ErrorBanner(message: appState.errorMessage),
                  if (folder != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
                      child: Text(
                        _folderPath(appState.folders, folder.id),
                        style: Theme.of(context).textTheme.bodySmall,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  TextField(
                    onChanged: appState.setSearchQuery,
                    decoration: const InputDecoration(
                      labelText: 'Search this folder',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (visibleNotes.isEmpty)
                    const _EmptyNotes()
                  else ...[
                    if (hasPinnedNotes) const _PinnedNotesHeader(),
                    if (canReorderNotes)
                      _ReorderableNotesList(
                        notes: visibleNotes,
                        folders: appState.folders,
                        onOpen: (note) => unawaited(_openNote(context, note)),
                        onReorder: (ordered) =>
                            unawaited(appState.reorderVisibleNotes(ordered)),
                      )
                    else
                      for (final note in visibleNotes)
                        _NoteTile(
                          note: note,
                          folderName: _folderName(
                            appState.folders,
                            note.folderId,
                          ),
                          onTap: () => unawaited(_openNote(context, note)),
                        ),
                  ],
                ],
              ),
            ),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => unawaited(_createNote(context)),
            icon: const Icon(Icons.add),
            label: const Text('New note'),
          ),
        );
      },
    );
  }

  Future<void> _createNote(BuildContext context) async {
    appState.selectFolder(folderId);
    await appState.createNote();
    if (context.mounted) {
      await _pushSelectedNoteRoute(context, appState);
    }
  }

  Future<void> _openNote(BuildContext context, NoteSummaryDto note) async {
    await appState.openNote(note);
    if (context.mounted) {
      await _pushSelectedNoteRoute(context, appState);
    }
  }
}

class _FolderTreeTile extends StatelessWidget {
  const _FolderTreeTile({
    required this.entry,
    required this.selected,
    required this.folders,
    required this.onSelect,
    required this.onAction,
  });

  final _FolderTreeEntry entry;
  final bool selected;
  final List<FolderDto> folders;
  final VoidCallback onSelect;
  final ValueChanged<_FolderAction> onAction;

  @override
  Widget build(BuildContext context) {
    final childCount = folders
        .where((folder) => folder.parentFolderId == entry.folder.id)
        .length;

    return ListTile(
      dense: true,
      selected: selected,
      contentPadding: EdgeInsets.only(left: 16 + entry.depth * 18, right: 4),
      leading: Icon(
        selected
            ? Icons.folder_open
            : childCount > 0
            ? Icons.folder_copy_outlined
            : Icons.folder_outlined,
      ),
      title: Text(entry.folder.name, overflow: TextOverflow.ellipsis),
      subtitle: childCount > 0 ? Text('$childCount subfolders') : null,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.chevron_right),
          PopupMenuButton<_FolderAction>(
            tooltip: 'Folder actions',
            onSelected: onAction,
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: _FolderAction.newSubfolder,
                child: ListTile(
                  leading: Icon(Icons.create_new_folder_outlined),
                  title: Text('New subfolder'),
                ),
              ),
              PopupMenuItem(
                value: _FolderAction.rename,
                child: ListTile(
                  leading: Icon(Icons.drive_file_rename_outline),
                  title: Text('Rename'),
                ),
              ),
              PopupMenuItem(
                value: _FolderAction.move,
                child: ListTile(
                  leading: Icon(Icons.drive_file_move_outline),
                  title: Text('Move'),
                ),
              ),
              PopupMenuItem(
                value: _FolderAction.reorderSiblings,
                child: ListTile(
                  leading: Icon(Icons.swap_vert),
                  title: Text('Reorder siblings'),
                ),
              ),
              PopupMenuItem(
                value: _FolderAction.delete,
                child: ListTile(
                  leading: Icon(Icons.delete_outline),
                  title: Text('Delete'),
                ),
              ),
            ],
          ),
        ],
      ),
      onTap: onSelect,
    );
  }
}

class _FolderTreeEntry {
  const _FolderTreeEntry({required this.folder, required this.depth});

  final FolderDto folder;
  final int depth;
}

class _FolderSelection {
  const _FolderSelection(this.folderId);

  final String? folderId;
}

class _ReorderFoldersSheet extends StatefulWidget {
  const _ReorderFoldersSheet({
    required this.title,
    required this.initialFolders,
  });

  final String title;
  final List<FolderDto> initialFolders;

  @override
  State<_ReorderFoldersSheet> createState() => _ReorderFoldersSheetState();
}

class _ReorderFoldersSheetState extends State<_ReorderFoldersSheet> {
  late List<FolderDto> folders;

  @override
  void initState() {
    super.initState();
    folders = [...widget.initialFolders];
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ReorderableListView.builder(
                itemCount: folders.length,
                onReorderItem: (oldIndex, newIndex) {
                  setState(() {
                    final moved = folders.removeAt(oldIndex);
                    folders.insert(newIndex, moved);
                  });
                },
                itemBuilder: (context, index) {
                  final folder = folders[index];
                  return ListTile(
                    key: ValueKey('folder-reorder-${folder.id}'),
                    leading: const Icon(Icons.drag_handle),
                    title: Text(folder.name),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop([...folders]),
              icon: const Icon(Icons.check),
              label: const Text('Save order'),
            ),
          ],
        ),
      ),
    );
  }
}

enum _FolderAction { newSubfolder, rename, move, reorderSiblings, delete }

List<_FolderTreeEntry> _folderTreeEntries(List<FolderDto> folders) {
  final byParent = <String?, List<FolderDto>>{};

  for (final folder in folders) {
    byParent.putIfAbsent(folder.parentFolderId, () => []).add(folder);
  }

  for (final siblings in byParent.values) {
    siblings.sort(_compareFolders);
  }

  final entries = <_FolderTreeEntry>[];

  void walk(String? parentFolderId, int depth) {
    for (final folder in byParent[parentFolderId] ?? const <FolderDto>[]) {
      entries.add(_FolderTreeEntry(folder: folder, depth: depth));
      walk(folder.id, depth + 1);
    }
  }

  walk(null, 0);
  return entries;
}

int _compareFolders(FolderDto a, FolderDto b) {
  final orderComparison = a.sortOrder.compareTo(b.sortOrder);
  return orderComparison == 0 ? a.name.compareTo(b.name) : orderComparison;
}

List<FolderDto> _folderSiblings(
  List<FolderDto> folders,
  String? parentFolderId,
) {
  return folders
      .where((folder) => folder.parentFolderId == parentFolderId)
      .toList(growable: false)
    ..sort(_compareFolders);
}

Future<void> _createFolder(
  BuildContext context,
  NotkaAppState appState, {
  String? parentFolderId,
}) async {
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
    unawaited(
      appState.createFolder(name.trim(), parentFolderId: parentFolderId),
    );
  }
}

Future<void> _renameFolder(
  BuildContext context,
  NotkaAppState appState,
  FolderDto folder,
) async {
  appState.selectFolder(folder.id);
  final controller = TextEditingController(text: folder.name);
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

Future<void> _deleteFolder(
  BuildContext context,
  NotkaAppState appState,
  FolderDto folder,
) async {
  appState.selectFolder(folder.id);
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Delete ${folder.name}?'),
      content: const Text(
        'Notes in this folder and its subfolders will be moved to All notes.',
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
    unawaited(appState.deleteSelectedFolder());
  }
}

Future<void> _handleFolderAction(
  BuildContext context,
  NotkaAppState appState,
  FolderDto folder,
  _FolderAction action,
) async {
  switch (action) {
    case _FolderAction.newSubfolder:
      await _createFolder(context, appState, parentFolderId: folder.id);
      break;
    case _FolderAction.rename:
      await _renameFolder(context, appState, folder);
      break;
    case _FolderAction.move:
      final selection = await _selectFolderTarget(
        context,
        appState.folders,
        title: 'Move folder',
        movingFolder: folder,
      );
      if (selection != null) {
        unawaited(appState.moveFolder(folder, selection.folderId));
      }
      break;
    case _FolderAction.reorderSiblings:
      await _reorderFolderSiblings(context, appState, folder.parentFolderId);
      break;
    case _FolderAction.delete:
      await _deleteFolder(context, appState, folder);
      break;
  }
}

Future<void> _reorderFolderSiblings(
  BuildContext context,
  NotkaAppState appState,
  String? parentFolderId,
) async {
  final siblings = _folderSiblings(appState.folders, parentFolderId);
  if (siblings.length < 2) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('There is nothing to reorder here.')),
    );
    return;
  }

  final ordered = await showModalBottomSheet<List<FolderDto>>(
    context: context,
    isScrollControlled: true,
    builder: (context) => FractionallySizedBox(
      heightFactor: 0.7,
      child: _ReorderFoldersSheet(
        title: parentFolderId == null
            ? 'Reorder root folders'
            : 'Reorder folders',
        initialFolders: siblings,
      ),
    ),
  );

  if (ordered != null) {
    unawaited(appState.reorderSiblingFolders(parentFolderId, ordered));
  }
}

Future<_FolderSelection?> _selectFolderTarget(
  BuildContext context,
  List<FolderDto> folders, {
  required String title,
  FolderDto? movingFolder,
  String? selectedFolderId,
}) {
  final entries = _folderTreeEntries(folders);

  return showModalBottomSheet<_FolderSelection>(
    context: context,
    isScrollControlled: true,
    builder: (context) => SafeArea(
      child: FractionallySizedBox(
        heightFactor: 0.75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                children: [
                  ListTile(
                    leading: const Icon(Icons.all_inbox_outlined),
                    selected: selectedFolderId == null,
                    title: const Text('All notes'),
                    subtitle: const Text('No folder'),
                    onTap: () =>
                        Navigator.of(context).pop(const _FolderSelection(null)),
                  ),
                  const Divider(height: 1),
                  for (final entry in entries)
                    _FolderPickerTile(
                      entry: entry,
                      selected: selectedFolderId == entry.folder.id,
                      enabled: _canMoveFolderTo(
                        folders,
                        movingFolder,
                        entry.folder.id,
                      ),
                      onTap: () => Navigator.of(
                        context,
                      ).pop(_FolderSelection(entry.folder.id)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _FolderPickerTile extends StatelessWidget {
  const _FolderPickerTile({
    required this.entry,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final _FolderTreeEntry entry;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      enabled: enabled,
      selected: selected,
      contentPadding: EdgeInsets.only(left: 16 + entry.depth * 18, right: 16),
      leading: const Icon(Icons.folder_outlined),
      title: Text(entry.folder.name),
      onTap: enabled ? onTap : null,
    );
  }
}

bool _canMoveFolderTo(
  List<FolderDto> folders,
  FolderDto? movingFolder,
  String targetFolderId,
) {
  if (movingFolder == null) {
    return true;
  }

  if (targetFolderId == movingFolder.id) {
    return false;
  }

  return !_descendantFolderIds(
    folders,
    movingFolder.id,
  ).contains(targetFolderId);
}

Set<String> _descendantFolderIds(List<FolderDto> folders, String folderId) {
  final descendants = <String>{};

  void walk(String parentId) {
    for (final folder in folders.where(
      (entry) => entry.parentFolderId == parentId,
    )) {
      if (descendants.add(folder.id)) {
        walk(folder.id);
      }
    }
  }

  walk(folderId);
  return descendants;
}

String? _folderName(List<FolderDto> folders, String? folderId) {
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

String _folderPath(List<FolderDto> folders, String folderId) {
  final byId = {for (final folder in folders) folder.id: folder};
  final segments = <String>[];
  final seen = <String>{};
  FolderDto? current = byId[folderId];

  while (current != null && seen.add(current.id)) {
    segments.insert(0, current.name);
    current = current.parentFolderId == null
        ? null
        : byId[current.parentFolderId];
  }

  return segments.join(' / ');
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

class _PinnedNotesHeader extends StatelessWidget {
  const _PinnedNotesHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(0, 0, 0, 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF3A310D),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE1B12C)),
      ),
      child: Row(
        children: [
          const Icon(Icons.push_pin, color: Color(0xFFFFD45A), size: 18),
          const SizedBox(width: 8),
          Text(
            'Pinned notes',
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: const Color(0xFFFFD45A)),
          ),
        ],
      ),
    );
  }
}

class _NoteTile extends StatelessWidget {
  const _NoteTile({
    required this.note,
    required this.onTap,
    this.folderName,
    this.reorderEnabled = false,
    super.key,
  });

  final NoteSummaryDto note;
  final String? folderName;
  final bool reorderEnabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final pinnedColor = const Color(0xFF332B0B);
    final pinnedBorderColor = const Color(0xFFE1B12C);
    final subtitle = [
      if (folderName != null) folderName,
      if (note.excerpt != null && note.excerpt!.trim().isNotEmpty) note.excerpt,
      if (note.checklistTotal > 0)
        '${note.checklistCompleted}/${note.checklistTotal} done',
    ].join('  |  ');

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 5),
      color: note.pinned ? pinnedColor : null,
      shape: note.pinned
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: pinnedBorderColor),
            )
          : null,
      child: ListTile(
        onTap: onTap,
        leading: Icon(
          note.pinned ? Icons.push_pin : Icons.notes_outlined,
          color: note.pinned ? const Color(0xFFFFD45A) : null,
        ),
        title: Text(note.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: subtitle.isEmpty
            ? null
            : Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
        trailing: Icon(
          reorderEnabled ? Icons.drag_handle : Icons.chevron_right,
        ),
      ),
    );
  }
}

class _NoteEditorRoute extends StatelessWidget {
  const _NoteEditorRoute({required this.appState});

  final NotkaAppState appState;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: appState,
      builder: (context, _) {
        final note = appState.selectedNote;

        if (note == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted && Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          });

          return const Scaffold(
            body: SafeArea(child: Center(child: CircularProgressIndicator())),
          );
        }

        return NoteEditorScreen(
          appState: appState,
          note: note,
          isTrash: appState.selectedNoteIsTrash,
        );
      },
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
  _ChecklistData? checklistData;
  String saveStatus = 'Saved';
  bool titleDirty = false;
  bool exitSaveQueued = false;

  @override
  void initState() {
    super.initState();
    titleController = TextEditingController(text: widget.note.title);
    contentController = TextEditingController(text: widget.note.content);
    checklistData = _parseChecklist(widget.note.content);
  }

  @override
  void didUpdateWidget(covariant NoteEditorScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.note.id != widget.note.id) {
      titleController.text = widget.note.title;
      contentController.text = widget.note.content;
      checklistData = _parseChecklist(widget.note.content);
      saveStatus = 'Saved';
      titleDirty = false;
    }
  }

  @override
  void dispose() {
    _saveOnExit();
    saveTimer?.cancel();
    titleController.dispose();
    contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: _closeEditor,
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
                IconButton(
                  tooltip: 'Move to folder',
                  onPressed: _moveToFolder,
                  icon: const Icon(Icons.folder_open_outlined),
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
                final checklist = checklistData;
                if (checklist != null) {
                  _writeChecklistContent(checklist);
                }
                _scheduleSave();
              },
            ),
            if (widget.isTrash)
              _TrashNotice(
                onRestore: () =>
                    unawaited(widget.appState.restoreSelectedTrashNote()),
                onDeleteForever: _deleteForever,
              ),
            const SizedBox(height: 12),
            if (checklistData case final checklist?)
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
                  labelText: 'Note',
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
    );
  }

  void _closeEditor() {
    _saveOnExit();
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      widget.appState.closeNote();
    }
  }

  void _saveOnExit() {
    if (exitSaveQueued) {
      return;
    }
    exitSaveQueued = true;

    if (widget.isTrash || widget.appState.selectedNoteConflict) {
      return;
    }

    saveTimer?.cancel();
    unawaited(
      widget.appState.saveSelectedNote(
        content: contentController.text,
        title: titleDirty
            ? titleController.text.trim().isEmpty
                  ? 'Untitled note'
                  : titleController.text.trim()
            : null,
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
    checklistData = data;
    _writeChecklistContent(data);
    _scheduleSave();
  }

  void _writeChecklistContent(_ChecklistData data) {
    contentController.text = data.toStorageContent(
      titleController.text.trim().isEmpty
          ? 'Checklist'
          : titleController.text.trim(),
    );
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

  Future<void> _moveToFolder() async {
    _flushSave();
    final selection = await _selectFolderTarget(
      context,
      widget.appState.folders,
      title: 'Move note',
      selectedFolderId: widget.note.folderId,
    );

    if (selection != null) {
      unawaited(widget.appState.moveSelectedNoteToFolder(selection.folderId));
    }
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
      checklistData = _parseChecklist(note.content);
      saveStatus = 'Saved';
      titleDirty = false;
    });
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
        content: const Text('This permanently removes the note.'),
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

String _templateName(TemplateDto template) {
  return switch (template.id) {
    'blank' => 'Blank note',
    'checklist' => 'Checklist',
    'table' => 'Table',
    'daily' => 'Daily note',
    _ => template.name,
  };
}

const _checklistMarker = '<!-- notka:type=checklist -->';

int _checklistIdSeed = 0;

String _nextChecklistId() => 'checklist-${_checklistIdSeed++}';

class _ChecklistItemData {
  _ChecklistItemData({String? id, required this.checked, required this.text})
    : id = id ?? _nextChecklistId();

  final String id;
  bool checked;
  String text;

  _ChecklistItemData copy() {
    return _ChecklistItemData(id: id, checked: checked, text: text);
  }
}

class _ChecklistCategoryData {
  _ChecklistCategoryData({String? id, required this.name, required this.items})
    : id = id ?? _nextChecklistId();

  final String id;
  String name;
  List<_ChecklistItemData> items;

  _ChecklistCategoryData copy() {
    return _ChecklistCategoryData(
      id: id,
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

  String toStorageContent(String fallbackTitle) {
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
    final items = [for (final category in data.categories) ...category.items];
    final completed = items.where((item) => item.checked).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (items.isNotEmpty) ...[
          _ChecklistProgress(completed: completed, total: items.length),
          const SizedBox(height: 12),
        ],
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
          Wrap(
            spacing: 8,
            children: [
              TextButton.icon(
                onPressed: () {
                  final next = data.copy();
                  final category = next.categories.isEmpty
                      ? _ChecklistCategoryData(name: 'Checklist', items: [])
                      : next.categories.last;
                  if (next.categories.isEmpty) {
                    next.categories.add(category);
                  }
                  category.items.add(
                    _ChecklistItemData(checked: false, text: ''),
                  );
                  onChanged(next);
                },
                icon: const Icon(Icons.add),
                label: const Text('Add item'),
              ),
              TextButton.icon(
                onPressed: () {
                  final next = data.copy();
                  next.categories.add(
                    _ChecklistCategoryData(
                      name: 'Section ${next.categories.length + 1}',
                      items: [_ChecklistItemData(checked: false, text: '')],
                    ),
                  );
                  onChanged(next);
                },
                icon: const Icon(Icons.playlist_add),
                label: const Text('Add section'),
              ),
            ],
          ),
      ],
    );
  }
}

class _ChecklistProgress extends StatelessWidget {
  const _ChecklistProgress({required this.completed, required this.total});

  final int completed;
  final int total;

  @override
  Widget build(BuildContext context) {
    final value = total == 0 ? 0.0 : completed / total;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            completed == total ? Icons.check_circle : Icons.checklist,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(value: value, minHeight: 8),
            ),
          ),
          const SizedBox(width: 12),
          Text('$completed/$total'),
        ],
      ),
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
    final showTitle =
        data.categories.length > 1 ||
        category.name.trim().toLowerCase() != 'checklist';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showTitle) ...[
            TextFormField(
              key: ValueKey('category-${category.id}'),
              initialValue: category.name,
              enabled: !readOnly,
              decoration: const InputDecoration(
                labelText: 'Section',
                prefixIcon: Icon(Icons.label_outline),
              ),
              onChanged: (value) {
                final next = data.copy();
                next.categories[categoryIndex].name = value;
                onChanged(next);
              },
            ),
            const SizedBox(height: 10),
          ],
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
          if (!readOnly && showTitle)
            Align(
              alignment: Alignment.centerRight,
              child: IconButton(
                tooltip: 'Delete section',
                onPressed: data.categories.length == 1
                    ? null
                    : () {
                        final next = data.copy();
                        next.categories.removeAt(categoryIndex);
                        onChanged(next);
                      },
                icon: const Icon(Icons.delete_outline),
              ),
            ),
        ],
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
    final textStyle = Theme.of(context).textTheme.bodyLarge?.copyWith(
      decoration: item.checked ? TextDecoration.lineThrough : null,
      color: item.checked
          ? Theme.of(context).colorScheme.onSurfaceVariant
          : null,
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(2, 2, 4, 2),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
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
              key: ValueKey('item-${item.id}'),
              initialValue: item.text,
              enabled: !readOnly,
              style: textStyle,
              minLines: 1,
              maxLines: null,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                hintText: 'List item',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                isDense: true,
              ),
              onChanged: (value) {
                final next = data.copy();
                next.categories[categoryIndex].items[itemIndex].text = value;
                onChanged(next);
              },
              onFieldSubmitted: (_) {
                if (readOnly) {
                  return;
                }
                final next = data.copy();
                next.categories[categoryIndex].items.insert(
                  itemIndex + 1,
                  _ChecklistItemData(checked: false, text: ''),
                );
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
