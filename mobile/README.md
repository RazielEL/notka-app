# Notka Mobile

Flutter client for a self-hosted Notka server.

The project is intentionally cross-platform, but Android is the active development
target for now. iOS project files are kept in the repo so the app can be smoke
tested and signed on macOS later without a rewrite.

## Run

From this directory:

```bash
flutter run
```

When connecting an Android emulator to a local Next dev server, use:

```text
http://10.0.2.2:3000
```

For a physical phone, use the reachable LAN, Tailscale, or public HTTPS address
of the self-hosted Notka instance.

## Verify

```bash
flutter analyze
flutter test
flutter build apk --debug
```

The debug APK is written to:

```text
build/app/outputs/flutter-apk/app-debug.apk
```
