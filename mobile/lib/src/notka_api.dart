import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

typedef SessionCookieChanged = Future<void> Function(String? cookie);

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;
  bool get isConflict => statusCode == 409;

  @override
  String toString() => message;
}

class NotkaApiClient {
  NotkaApiClient({
    required String baseUrl,
    required this.sessionCookie,
    required this.onSessionCookieChanged,
    http.Client? httpClient,
  }) : _client = httpClient ?? http.Client(),
       baseUrl = _normalizeBaseUrl(baseUrl);

  final String baseUrl;
  final String? sessionCookie;
  final SessionCookieChanged onSessionCookieChanged;
  final http.Client _client;

  Future<BootstrapStatus> bootstrap() async {
    final body = await _sendJson('GET', '/api/mobile/bootstrap');
    return BootstrapStatus.fromJson(_asObject(body));
  }

  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final body = await _sendJson(
      'POST',
      '/api/auth/login',
      body: {'email': email, 'password': password},
    );
    return AuthUser.fromJson(_asObject(_asObject(body)['user']));
  }

  Future<AuthUser> setup({
    required String email,
    required String displayName,
    required String password,
  }) async {
    final body = await _sendJson(
      'POST',
      '/api/auth/setup',
      body: {
        'email': email,
        'displayName': displayName,
        'password': password,
        'language': 'en',
      },
    );
    return AuthUser.fromJson(_asObject(_asObject(body)['user']));
  }

  Future<AuthUser> register({
    required String email,
    required String displayName,
    required String password,
  }) async {
    final body = await _sendJson(
      'POST',
      '/api/auth/register',
      body: {'email': email, 'displayName': displayName, 'password': password},
    );
    return AuthUser.fromJson(_asObject(_asObject(body)['user']));
  }

  Future<void> logout() async {
    await _sendJson('POST', '/api/auth/logout');
    await onSessionCookieChanged(null);
  }

  Future<HiddenNotesSettingsDto> hiddenNotesSettings() async {
    final body = await _sendJson('GET', '/api/hidden-notes');
    return HiddenNotesSettingsDto.fromJson(_asObject(body));
  }

  Future<HiddenNotesSettingsDto> unlockHiddenNotes(String value) async {
    final body = await _sendJson(
      'POST',
      '/api/hidden-notes/unlock',
      body: {'value': value},
    );
    return HiddenNotesSettingsDto.fromJson(_asObject(body));
  }

  Future<HiddenNotesSettingsDto> setHiddenNotesPin({
    required String? pin,
    required String password,
  }) async {
    final body = await _sendJson(
      'PATCH',
      '/api/hidden-notes',
      body: {'pin': pin, 'password': password},
    );
    return HiddenNotesSettingsDto.fromJson(_asObject(body));
  }

  Future<HiddenNotesSettingsDto> lockHiddenNotes() async {
    final body = await _sendJson('DELETE', '/api/hidden-notes');
    return HiddenNotesSettingsDto.fromJson(_asObject(body));
  }

  Future<List<FolderDto>> listFolders({
    NoteScope scope = NoteScope.personal,
  }) async {
    final body = await _sendJson('GET', '/api/folders?scope=${scope.toJson()}');
    final folders = _asObject(body)['folders'];

    if (folders is! List) {
      return const [];
    }

    return folders
        .whereType<Map<String, Object?>>()
        .map(FolderDto.fromJson)
        .toList(growable: false);
  }

  Future<List<NoteSummaryDto>> listNotes({
    NoteScope scope = NoteScope.personal,
  }) async {
    final body = await _sendJson('GET', '/api/notes?scope=${scope.toJson()}');
    final notes = _asObject(body)['notes'];

    if (notes is! List) {
      return const [];
    }

    return notes
        .whereType<Map<String, Object?>>()
        .map(NoteSummaryDto.fromJson)
        .toList(growable: false);
  }

  Future<List<NoteSummaryDto>> listTrashNotes({
    NoteScope scope = NoteScope.personal,
  }) async {
    final body = await _sendJson(
      'GET',
      '/api/notes?scope=${scope.toJson()}&trash=true',
    );
    final notes = _asObject(body)['notes'];

    if (notes is! List) {
      return const [];
    }

    return notes
        .whereType<Map<String, Object?>>()
        .map(NoteSummaryDto.fromJson)
        .toList(growable: false);
  }

  Future<List<NoteSummaryDto>> listHiddenNotes() async {
    final body = await _sendJson('GET', '/api/notes?hidden=true');
    final notes = _asObject(body)['notes'];

    if (notes is! List) {
      return const [];
    }

    return notes
        .whereType<Map<String, Object?>>()
        .map(NoteSummaryDto.fromJson)
        .toList(growable: false);
  }

  Future<List<TemplateDto>> listTemplates() async {
    final body = await _sendJson('GET', '/api/templates');
    final templates = _asObject(body)['templates'];

    if (templates is! List) {
      return const [];
    }

    return templates
        .whereType<Map<String, Object?>>()
        .map(TemplateDto.fromJson)
        .toList(growable: false);
  }

  Future<NoteDetailDto> getNote(
    String noteId, {
    NoteScope scope = NoteScope.personal,
    bool trash = false,
    bool hidden = false,
  }) async {
    final trashQuery = trash ? '&trash=true' : '';
    final hiddenQuery = hidden ? '&hidden=true' : '';
    final body = await _sendJson(
      'GET',
      '/api/notes/$noteId?scope=${scope.toJson()}$trashQuery$hiddenQuery',
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<NoteDetailDto> createNote({
    String? folderId,
    String? templateId,
    NoteScope scope = NoteScope.personal,
    bool hidden = false,
  }) async {
    final body = await _sendJson(
      'POST',
      '/api/notes',
      body: {
        'folderId': folderId,
        'templateId': templateId,
        'scope': scope.toJson(),
        'language': 'en',
        'hidden': hidden,
      },
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<TemplateDto> createTemplateFromNote(
    NoteDetailDto note, {
    required String name,
  }) async {
    final body = await _sendJson(
      'POST',
      '/api/templates',
      body: {
        'name': name,
        'sourceNoteId': note.id,
        'scope': note.scope.toJson(),
      },
    );
    return TemplateDto.fromJson(_asObject(_asObject(body)['template']));
  }

  Future<FolderDto> createFolder({
    required String name,
    String? parentFolderId,
    NoteScope scope = NoteScope.personal,
  }) async {
    final body = await _sendJson(
      'POST',
      '/api/folders',
      body: {
        'name': name,
        'parentFolderId': parentFolderId,
        'scope': scope.toJson(),
      },
    );
    return FolderDto.fromJson(_asObject(_asObject(body)['folder']));
  }

  Future<FolderDto> updateFolder(
    FolderDto folder, {
    String? name,
    Object? parentFolderId = _unset,
  }) async {
    final body = await _sendJson(
      'PATCH',
      '/api/folders/${folder.id}',
      body: {
        'scope': folder.scope.toJson(),
        'name': ?name,
        if (!identical(parentFolderId, _unset))
          'parentFolderId': parentFolderId,
      },
    );
    return FolderDto.fromJson(_asObject(_asObject(body)['folder']));
  }

  Future<void> deleteFolder(FolderDto folder) async {
    await _sendJson(
      'DELETE',
      '/api/folders/${folder.id}?moveToRoot=true&scope=${folder.scope.toJson()}',
    );
  }

  Future<NoteDetailDto> updateNote(
    NoteDetailDto note, {
    required String content,
    String? title,
    bool hidden = false,
  }) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}',
      body: {
        'content': content,
        'contentHash': note.contentHash,
        'scope': note.scope.toJson(),
        'title': ?title,
        if (hidden) 'hiddenContext': true,
      },
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<NoteDetailDto> moveNoteToFolder(
    NoteDetailDto note, {
    required String? folderId,
    bool hidden = false,
  }) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}',
      body: {
        'folderId': folderId,
        'scope': note.scope.toJson(),
        if (hidden) 'hiddenContext': true,
      },
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<NoteDetailDto> setNotePinned(
    NoteDetailDto note, {
    required bool pinned,
    bool hidden = false,
  }) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}',
      body: {
        'pinned': pinned,
        'scope': note.scope.toJson(),
        if (hidden) 'hiddenContext': true,
      },
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<NoteDetailDto> updateNoteSchedule(
    NoteDetailDto note, {
    Object? alertAt = _unset,
    Object? calendarAt = _unset,
    bool hidden = false,
  }) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}',
      body: {
        'scope': note.scope.toJson(),
        if (!identical(alertAt, _unset)) 'alertAt': alertAt,
        if (!identical(calendarAt, _unset)) 'calendarAt': calendarAt,
        if (hidden) 'hiddenContext': true,
      },
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<void> deleteNote(NoteDetailDto note, {bool hidden = false}) async {
    final hiddenQuery = hidden ? '&hidden=true' : '';
    await _sendJson(
      'DELETE',
      '/api/notes/${note.id}?scope=${note.scope.toJson()}$hiddenQuery',
    );
  }

  Future<NoteDetailDto> restoreNote(NoteDetailDto note) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}',
      body: {'restore': true, 'scope': note.scope.toJson()},
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<void> hardDeleteNote(NoteDetailDto note) async {
    await _sendJson(
      'DELETE',
      '/api/notes/${note.id}?scope=${note.scope.toJson()}&hard=true',
    );
  }

  Future<NoteDetailDto> hideNote(NoteDetailDto note) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}/hidden',
      body: {'hidden': true, 'scope': note.scope.toJson()},
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<NoteDetailDto> unhideNote(NoteDetailDto note) async {
    final body = await _sendJson(
      'PATCH',
      '/api/notes/${note.id}/hidden',
      body: {'hidden': false, 'scope': note.scope.toJson()},
    );
    return NoteDetailDto.fromJson(_asObject(_asObject(body)['note']));
  }

  Future<Object?> _sendJson(String method, String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (sessionCookie != null && sessionCookie!.isNotEmpty)
        'Cookie': sessionCookie!,
    };
    final request = http.Request(method, uri)
      ..headers.addAll(headers)
      ..body = body == null ? '' : jsonEncode(body);
    final streamed = await _client
        .send(request)
        .timeout(const Duration(seconds: 15));
    final response = await http.Response.fromStream(streamed);
    final cookie = _mergeSetCookies(
      sessionCookie,
      response.headers['set-cookie'],
    );

    if (cookie != sessionCookie) {
      await onSessionCookieChanged(cookie);
    }

    Object? decoded;
    if (response.body.trim().isNotEmpty) {
      try {
        decoded = jsonDecode(response.body);
      } on FormatException {
        throw ApiException(
          'Server returned invalid JSON.',
          statusCode: response.statusCode,
        );
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded is Map<String, Object?> ? decoded['error'] : null;
      throw ApiException(
        error is String && error.isNotEmpty ? error : 'Request failed.',
        statusCode: response.statusCode,
      );
    }

    return decoded;
  }

  static String _normalizeBaseUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      throw ApiException('Enter your Notka server address.');
    }

    final withScheme =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : 'https://$trimmed';
    final uri = Uri.tryParse(withScheme);

    if (uri == null || uri.host.isEmpty) {
      throw ApiException('Enter a valid Notka server address.');
    }

    return withScheme.replaceFirst(RegExp(r'/+$'), '');
  }

  static Map<String, Object?> _asObject(Object? value) {
    if (value is Map<String, Object?>) {
      return value;
    }

    if (value is Map) {
      return value.map((key, value) => MapEntry(key.toString(), value));
    }

    throw ApiException('Server response had an unexpected shape.');
  }

  static String? _mergeSetCookies(String? current, String? header) {
    if (header == null || header.isEmpty) {
      return current;
    }

    final cookies = <String, String>{};

    for (final entry in (current ?? '').split(';')) {
      final index = entry.indexOf('=');
      if (index <= 0) {
        continue;
      }

      final name = entry.substring(0, index).trim();
      final value = entry.substring(index + 1).trim();
      if (name.isNotEmpty && value.isNotEmpty) {
        cookies[name] = value;
      }
    }

    final matches = RegExp(
      r'(notka_session|notka_hidden_access)=([^;,\s]*)',
    ).allMatches(header);

    for (final match in matches) {
      final name = match.group(1);
      final value = match.group(2);
      if (name == null || value == null) {
        continue;
      }

      if (value.isEmpty) {
        cookies.remove(name);
      } else {
        cookies[name] = value;
      }
    }

    if (cookies.isEmpty) {
      return null;
    }

    return cookies.entries
        .map((entry) => '${entry.key}=${entry.value}')
        .join('; ');
  }
}

const Object _unset = Object();
