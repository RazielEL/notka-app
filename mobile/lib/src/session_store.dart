import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ServerConfigStore {
  static const _serverUrlKey = 'notka.serverUrl';

  Future<String?> readServerUrl() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString(_serverUrlKey);
  }

  Future<void> writeServerUrl(String value) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_serverUrlKey, value);
  }

  Future<void> clearServerUrl() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_serverUrlKey);
  }
}

class SessionStore {
  static const _sessionCookieKey = 'notka.sessionCookie';
  static const _fallbackSessionCookieKey = 'notka.sessionCookie.fallback';
  static const _storage = FlutterSecureStorage();

  Future<String?> readSessionCookie() async {
    try {
      return _persistentSessionCookie(
        await _storage.read(key: _sessionCookieKey),
      );
    } catch (_) {
      final preferences = await SharedPreferences.getInstance();
      return _persistentSessionCookie(
        preferences.getString(_fallbackSessionCookieKey),
      );
    }
  }

  Future<void> writeSessionCookie(String? value) async {
    final persistentValue = _persistentSessionCookie(value);

    try {
      if (persistentValue == null || persistentValue.isEmpty) {
        await _storage.delete(key: _sessionCookieKey);
        return;
      }

      await _storage.write(key: _sessionCookieKey, value: persistentValue);
    } catch (_) {
      final preferences = await SharedPreferences.getInstance();

      if (persistentValue == null || persistentValue.isEmpty) {
        await preferences.remove(_fallbackSessionCookieKey);
        return;
      }

      await preferences.setString(_fallbackSessionCookieKey, persistentValue);
    }
  }

  String? _persistentSessionCookie(String? value) {
    if (value == null || value.isEmpty) {
      return null;
    }

    final cookies = <String>[];
    for (final entry in value.split(';')) {
      final trimmed = entry.trim();
      if (trimmed.startsWith('notka_session=')) {
        cookies.add(trimmed);
      }
    }

    return cookies.isEmpty ? null : cookies.join('; ');
  }
}
