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
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      role: json['role'] as String? ?? 'user',
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
      app: json['app'] as String? ?? 'Notka',
      version: json['version'] as String? ?? '',
      hasUsers: json['hasUsers'] == true,
      serverTime: DateTime.tryParse(json['serverTime'] as String? ?? ''),
      user: userJson is Map<String, Object?>
          ? AuthUser.fromJson(userJson)
          : null,
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
      id: json['id'] as String? ?? '',
      scope: NoteScope.fromJson(json['scope']),
      parentFolderId: json['parentFolderId'] as String?,
      name: json['name'] as String? ?? 'Folder',
      sortOrder: json['sortOrder'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? ''),
    );
  }

  FolderDto copyWith({
    String? parentFolderId,
    bool clearParentFolderId = false,
    String? name,
    int? sortOrder,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FolderDto(
      id: id,
      scope: scope,
      parentFolderId: clearParentFolderId
          ? null
          : parentFolderId ?? this.parentFolderId,
      name: name ?? this.name,
      sortOrder: sortOrder ?? this.sortOrder,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
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
      id: json['id'] as String? ?? '',
      scope: NoteScope.fromJson(json['scope']),
      folderId: json['folderId'] as String?,
      title: json['title'] as String? ?? 'Untitled note',
      pinned: json['pinned'] == true,
      sortOrder: json['sortOrder'] as int? ?? 0,
      alertAt: DateTime.tryParse(json['alertAt'] as String? ?? ''),
      calendarAt: DateTime.tryParse(json['calendarAt'] as String? ?? ''),
      deletedAt: DateTime.tryParse(json['deletedAt'] as String? ?? ''),
      excerpt: json['excerpt'] as String?,
      checklistTotal: json['checklistTotal'] as int? ?? 0,
      checklistCompleted: json['checklistCompleted'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? ''),
    );
  }

  NoteSummaryDto copyWith({
    String? folderId,
    bool clearFolderId = false,
    String? title,
    bool? pinned,
    int? sortOrder,
    DateTime? alertAt,
    bool clearAlertAt = false,
    DateTime? calendarAt,
    bool clearCalendarAt = false,
    DateTime? deletedAt,
    bool clearDeletedAt = false,
    String? excerpt,
    bool clearExcerpt = false,
    int? checklistTotal,
    int? checklistCompleted,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return NoteSummaryDto(
      id: id,
      scope: scope,
      folderId: clearFolderId ? null : folderId ?? this.folderId,
      title: title ?? this.title,
      pinned: pinned ?? this.pinned,
      sortOrder: sortOrder ?? this.sortOrder,
      alertAt: clearAlertAt ? null : alertAt ?? this.alertAt,
      calendarAt: clearCalendarAt ? null : calendarAt ?? this.calendarAt,
      deletedAt: clearDeletedAt ? null : deletedAt ?? this.deletedAt,
      excerpt: clearExcerpt ? null : excerpt ?? this.excerpt,
      checklistTotal: checklistTotal ?? this.checklistTotal,
      checklistCompleted: checklistCompleted ?? this.checklistCompleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
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
      id: json['id'] as String? ?? '',
      scope: NoteScope.fromJson(json['scope']),
      folderId: json['folderId'] as String?,
      title: json['title'] as String? ?? 'Untitled note',
      pinned: json['pinned'] == true,
      sortOrder: json['sortOrder'] as int? ?? 0,
      alertAt: DateTime.tryParse(json['alertAt'] as String? ?? ''),
      calendarAt: DateTime.tryParse(json['calendarAt'] as String? ?? ''),
      deletedAt: DateTime.tryParse(json['deletedAt'] as String? ?? ''),
      excerpt: json['excerpt'] as String?,
      checklistTotal: json['checklistTotal'] as int? ?? 0,
      checklistCompleted: json['checklistCompleted'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? ''),
      content: json['content'] as String? ?? '',
      contentHash: json['contentHash'] as String? ?? '',
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
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Template',
      builtIn: json['builtIn'] == true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? ''),
    );
  }
}
