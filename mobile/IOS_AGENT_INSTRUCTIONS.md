# iOS Agent Instructions

Goal: verify the shared Flutter mobile app on macOS/iOS after the Android-side
parity work for today's web changes. Do not create an iOS-only fork of the
feature logic unless a platform issue forces it.

## Context

The shared Dart code now mirrors the web behavior for the features added today:

- Alert deadline tone: yellow when the alert deadline is within 3 days, red
  when it is within 1 day, with a visible warning icon on mobile note rows.
- Hidden Notes: separate section, no folder tree, unlock with PIN or account
  password, PIN changes require account password, hidden access locks again
  when leaving the Hidden section.
- Hidden Notes uses the web API cookie `notka_hidden_access`; the mobile API
  client now preserves it alongside `notka_session`.
- Hidden notes are editable after unlock, using hidden API context for save,
  pin, alert/calendar, delete, hide, and unhide paths.
- Markdown preview now renders ordered list lines like `1. item`.

## Steps

1. Pull `main` and work from `mobile/`.
2. Run dependency/bootstrap checks:

   ```bash
   flutter --version
   flutter pub get
   flutter devices
   ```

3. Verify shared Dart code on macOS:

   ```bash
   flutter analyze
   flutter test
   flutter build ios --no-codesign
   ```

4. Run on an iOS simulator or signed device:

   ```bash
   flutter run -d ios
   ```

5. Smoke test these flows:

   - Connect to a reachable Notka HTTPS server.
   - Sign in and load Personal and Group scopes.
   - Open Notes, Schedule, Trash, and Hidden.
   - Verify normal notes are still editable.
   - Set an alert deadline on a note and confirm mobile rows go yellow within
     3 days and red with warning icon within 1 day.
   - Open Markdown preview for content containing `1. first` and `2. second`;
     confirm ordered list rows render as ordered items.
   - Open Hidden, unlock with PIN or account password, and confirm hidden notes
     load.
   - Leave Hidden for Notes/Schedule/Trash, then return to Hidden and confirm
     it asks to unlock again.
   - From a personal note, use Hide; from a hidden note, use Unhide.
   - In the app menu, set and clear Hidden PIN; both must require account
     password.

6. If the server is HTTP-only for local testing, prefer HTTPS/tunnel first. If
   an ATS exception is unavoidable, keep it scoped to the exact dev host in
   `ios/Runner/Info.plist`; do not add a broad production exception.

7. If a signed archive is needed, build with the normal Apple signing profile.
   No `NOTKA_VIEW_ONLY` dart define should be used for this feature parity work.
