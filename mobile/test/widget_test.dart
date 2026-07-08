import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:notka_mobile/src/app_state.dart';
import 'package:notka_mobile/src/models.dart';
import 'package:notka_mobile/src/notka_mobile_app.dart';

void main() {
  testWidgets('renders the server connection flow', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: ServerConnectionScreen(appState: NotkaAppState())),
    );

    expect(find.text('Notka'), findsOneWidget);
    expect(find.text('Connect'), findsOneWidget);
  });

  test('parses loose note JSON values without throwing', () {
    final note = NoteSummaryDto.fromJson({
      'id': 123,
      'scope': 'group',
      'folderId': '',
      'title': null,
      'pinned': 'true',
      'sortOrder': 4.7,
      'alertAt': '2026-07-08T12:00:00.000Z',
      'calendarAt': null,
      'excerpt': null,
      'checklistTotal': '3',
      'checklistCompleted': 2.0,
      'createdAt': 'not-a-date',
      'updatedAt': '2026-07-08T12:30:00.000Z',
    });

    expect(note.id, '123');
    expect(note.scope, NoteScope.group);
    expect(note.folderId, isNull);
    expect(note.pinned, isTrue);
    expect(note.sortOrder, 4);
    expect(note.checklistTotal, 3);
    expect(note.checklistCompleted, 2);
    expect(note.createdAt, isNull);
    expect(note.updatedAt, isNotNull);
  });

  test('parses hidden notes settings', () {
    final settings = HiddenNotesSettingsDto.fromJson({
      'hasPin': 1,
      'unlocked': 'true',
    });

    expect(settings.hasPin, isTrue);
    expect(settings.unlocked, isTrue);
  });
}
