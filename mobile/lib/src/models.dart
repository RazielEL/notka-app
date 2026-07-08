String _asString(Object? value, String fallback) {
  if (value is String) {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return value.toString();
}

String? _asNullableString(Object? value) {
  if (value is String && value.isNotEmpty) {
    return value;
  }

  return null;
}

int _asInt(Object? value, [int fallback = 0]) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  if (value is String) {
    return int.tryParse(value) ?? fallback;
  }

  return fallback;
}

bool _asBool(Object? value) {
  if (value is bool) {
    return value;
  }

  if (value is num) {
    return value != 0;
  }

  if (value is String) {
    final normalized = value.trim().toLowerCase();
    return normalized == 'true' || normalized == '1';
  }

  return false;
}

DateTime? _asDateTime(Object? value) {
  if (value is DateTime) {
    return value;
  }

  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }

  return null;
}

enum NoteScope {
  personal,
  group;

  static NoteScope fromJson(Object? value) {
    return value == 'group' ? NoteScope.group : NoteScope.personal;
  }

  String toJson() => switch (this) {
    NoteScope.personal => 'personal',
    NoteScope.group => 'group',
  };
}

class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
  });

  final String id;
  final String email;
  final String displayName;
  final String role;

  factory AuthUser.fromJson(Map<String, Object?> json) {
    return AuthUser(
      id: _asString(json['id'], ''),
      email: _asString(json['email'], ''),
      displayName: _asString(json['displayName'], ''),
      role: _asString(json['role'], 'user'),
    );
  }
}

class BootstrapStatus {
  BootstrapStatus({
    required this.app,
    required this.version,
    required this.hasUsers,
    required this.serverTime,
    this.user,
  });

  final String app;
  final String version;
  final bool hasUsers;
  final DateTime? serverTime;
  final AuthUser? user;

  factory BootstrapStatus.fromJson(Map<String, Object?> json) {
    final userJson = json['user'];

    return BootstrapStatus(
      app: _asString(json['app'], 'Notka'),
      version: _asString(json['version'], ''),
      hasUsers: _asBool(json['hasUsers']),
      serverTime: _asDateTime(json['serverTime']),
      user: userJson is Map<String, Object?>
          ? AuthUser.fromJson(userJson)
          : null,
    );
  }
}

class HiddenNotesSettingsDto {
  HiddenNotesSettingsDto({required this.hasPin, required this.unlocked});

  final bool hasPin;
  final bool unlocked;

  factory HiddenNotesSettingsDto.fromJson(Map<String, Object?> json) {
    return HiddenNotesSettingsDto(
      hasPin: _asBool(json['hasPin']),
      unlocked: _asBool(json['unlocked']),
    );
  }
}

class FolderDto {
  FolderDto({
    required this.id,
    required this.scope,
    required this.name,
    required this.sortOrder,
    required this.createdAt,
    required this.updatedAt,
    this.parentFolderId,
  });

  final String id;
  final NoteScope scope;
  final String? parentFolderId;
  final String name;
  final int sortOrder;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory FolderDto.fromJson(Map<String, Object?> json) {
    return FolderDto(
      id: _asString(json['id'], ''),
      scope: NoteScope.fromJson(json['scope']),
      parentFolderId: _asNullableString(json['parentFolderId']),
      name: _asString(json['name'], 'Folder'),
      sortOrder: _asInt(json['sortOrder']),
      createdAt: _asDateTime(json['createdAt']),
      updatedAt: _asDateTime(json['updatedAt']),
    );
  }
}

class NoteSummaryDto {
  NoteSummaryDto({
    required this.id,
    required this.scope,
    required this.title,
    required this.pinned,
    required this.sortOrder,
    required this.checklistTotal,
    required this.checklistCompleted,
    required this.createdAt,
    required this.updatedAt,
    this.folderId,
    this.alertAt,
    this.calendarAt,
    this.deletedAt,
    this.excerpt,
  });

  final String id;
  final NoteScope scope;
  final String? folderId;
  final String title;
  final bool pinned;
  final int sortOrder;
  final DateTime? alertAt;
  final DateTime? calendarAt;
  final DateTime? deletedAt;
  final String? excerpt;
  final int checklistTotal;
  final int checklistCompleted;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory NoteSummaryDto.fromJson(Map<String, Object?> json) {
    return NoteSummaryDto(
      id: _asString(json['id'], ''),
      scope: NoteScope.fromJson(json['scope']),
      folderId: _asNullableString(json['folderId']),
      title: _asString(json['title'], 'Untitled note'),
      pinned: _asBool(json['pinned']),
      sortOrder: _asInt(json['sortOrder']),
      alertAt: _asDateTime(json['alertAt']),
      calendarAt: _asDateTime(json['calendarAt']),
      deletedAt: _asDateTime(json['deletedAt']),
      excerpt: _asNullableString(json['excerpt']),
      checklistTotal: _asInt(json['checklistTotal']),
      checklistCompleted: _asInt(json['checklistCompleted']),
      createdAt: _asDateTime(json['createdAt']),
      updatedAt: _asDateTime(json['updatedAt']),
    );
  }
}

class NoteDetailDto extends NoteSummaryDto {
  NoteDetailDto({
    required super.id,
    required super.scope,
    required super.title,
    required super.pinned,
    required super.sortOrder,
    required super.checklistTotal,
    required super.checklistCompleted,
    required super.createdAt,
    required super.updatedAt,
    required this.content,
    required this.contentHash,
    super.folderId,
    super.alertAt,
    super.calendarAt,
    super.deletedAt,
    super.excerpt,
  });

  final String content;
  final String contentHash;

  factory NoteDetailDto.fromJson(Map<String, Object?> json) {
    return NoteDetailDto(
      id: _asString(json['id'], ''),
      scope: NoteScope.fromJson(json['scope']),
      folderId: _asNullableString(json['folderId']),
      title: _asString(json['title'], 'Untitled note'),
      pinned: _asBool(json['pinned']),
      sortOrder: _asInt(json['sortOrder']),
      alertAt: _asDateTime(json['alertAt']),
      calendarAt: _asDateTime(json['calendarAt']),
      deletedAt: _asDateTime(json['deletedAt']),
      excerpt: _asNullableString(json['excerpt']),
      checklistTotal: _asInt(json['checklistTotal']),
      checklistCompleted: _asInt(json['checklistCompleted']),
      createdAt: _asDateTime(json['createdAt']),
      updatedAt: _asDateTime(json['updatedAt']),
      content: _asString(json['content'], ''),
      contentHash: _asString(json['contentHash'], ''),
    );
  }

  NoteSummaryDto toSummary() {
    return NoteSummaryDto(
      id: id,
      scope: scope,
      folderId: folderId,
      title: title,
      pinned: pinned,
      sortOrder: sortOrder,
      alertAt: alertAt,
      calendarAt: calendarAt,
      deletedAt: deletedAt,
      excerpt: excerpt,
      checklistTotal: checklistTotal,
      checklistCompleted: checklistCompleted,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

class TemplateDto {
  TemplateDto({
    required this.id,
    required this.name,
    required this.builtIn,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final bool builtIn;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory TemplateDto.fromJson(Map<String, Object?> json) {
    return TemplateDto(
      id: _asString(json['id'], ''),
      name: _asString(json['name'], 'Template'),
      builtIn: _asBool(json['builtIn']),
      createdAt: _asDateTime(json['createdAt']),
      updatedAt: _asDateTime(json['updatedAt']),
    );
  }
}
