import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:notka_mobile/src/app_state.dart';
import 'package:notka_mobile/src/notka_mobile_app.dart';

void main() {
  testWidgets('renders the server connection flow', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: ServerConnectionScreen(appState: NotkaAppState())),
    );

    expect(find.text('Notka'), findsOneWidget);
    expect(find.text('Connect'), findsOneWidget);
  });
}
