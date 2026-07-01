# Notka

Notka is a minimal self-hosted Markdown notes app with checklist support. Notes and checklists are the same thing: a checklist is just Markdown containing `- [ ]` and `- [x]`.

## What is included

- Next.js App Router, TypeScript, Tailwind CSS
- SQLite metadata at `/data/app.db`
- Drizzle schema and initial migration
- Personal Markdown note files at `/data/notes/{userId}/{noteId}.md`
- Group Markdown note files at `/data/notes/group/{noteId}.md`
- Deleted personal note files moved to `/data/trash/{userId}/{noteId}.md`
- Deleted group note files moved to `/data/trash/group/{noteId}.md`
- Template files at `/data/templates/{userId}/{templateId}.md`
- First-run admin setup
- Public account registration after first setup
- Email/password login with bcrypt password hashes
- Signed HTTP-only session cookies
- Folder CRUD, note CRUD, pin/unpin, checklist progress, title/excerpt indexing
- Personal Notes plus simple shared Group Notes for all authenticated users
- Built-in templates plus user templates
- Light/dark theme
- Dockerfile and docker-compose.yml

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. On first launch, Notka shows the setup screen and creates the first admin user, an Inbox folder, and a welcome note.

The development script stores local data in `./data`. In Docker and production, set `DATA_DIR=/data`; the included compose file already does this.

To reset local development data, run:

```bash
pnpm db:reset:dev -- --yes
```

This is destructive. It removes `./data`, including the local SQLite database and Markdown files. Do not run it against data you want to keep.

## Environment variables

Copy `.env.example` for local reference. Do not commit real `.env` files.

```text
SESSION_SECRET          Required in Docker/production. Keep stable across restarts.
SESSION_COOKIE_SECURE   Set to true only when serving Notka over HTTPS.
DATA_DIR                Persistent data directory. Docker uses /data.
SQLITE_DB_PATH          Optional override. Defaults to $DATA_DIR/app.db.
```

## Docker

```bash
export SESSION_SECRET="$(openssl rand -base64 48)"
docker compose up --build
```

The compose file mounts `./data` to `/data`, so all persistent app data lives in one directory:

```text
data/
  app.db
  notes/
  trash/
  templates/
```

`SESSION_SECRET` is required for Docker/production. Use a long random value and keep it stable across restarts, otherwise existing sessions will be invalidated. Notka is intended to sit behind your private network/Tailscale, but app-level login is still required.

By default, session cookies are HTTP-only and `SameSite=Lax`, with `Secure=false` so private HTTP deployments over Tailscale work. If you serve Notka over HTTPS, set:

```bash
export SESSION_COOKIE_SECURE=true
```

Do not mount or serve `./data` through a web server. It contains SQLite data plus Markdown files.

Back up the whole `data/` directory together while the app is stopped, or use a filesystem/database-aware snapshot so `app.db`, `app.db-wal`, Markdown notes, trash, and templates stay consistent.

`./data`, SQLite database files, build output, dependencies, and real environment files are ignored by git and Docker build context. `.env.example` is intentionally kept.

## Data model

SQLite stores users, sessions, folders, templates, and note indexes. Markdown bodies are stored as files on disk. The client never sends file paths; route handlers accept IDs only, verify ownership in SQLite, and resolve server-controlled paths under `/data`.

After the first admin setup, anyone with access to the self-hosted Notka instance can register an account from the login screen.

Group Notes use the same note and folder tables with `scope = 'group'`. Every registered user can view and edit Group Notes. Group pins are shared globally for now. Templates remain personal; creating a group note from a personal template is supported, while shared group templates are not part of this release.

## Security and MVP limits

- Notka is designed for a private network or Tailscale-style deployment, with app login still enabled. This is the recommended deployment model.
- Public internet exposure should use HTTPS, `SESSION_COOKIE_SECURE=true`, reverse-proxy hardening, request size limits, monitoring, and stronger abuse protection.
- Login does not include persistent rate limiting yet. Put the app behind a private network and avoid exposing it directly to the public internet.
- Note edits are last-write-wins. Two browser tabs or two users editing the same Group Note at the same time can overwrite each other. Note save/delete operations are serialized per note inside a single app process, but there is no multi-user merge UI yet.
- Markdown file writes are atomic, but SQLite and filesystem writes are not one distributed transaction. The app rolls back practical partial failures, and backups should include the whole `data/` directory consistently.
- If a Markdown file is missing while its SQLite index row still exists, the app currently opens it as empty content. Treat that as operational data corruption and restore from backup.

## Useful scripts

```bash
pnpm dev       # start the development server
pnpm build     # production build
pnpm start     # start a production server after build
pnpm lint      # run Next.js linting
```
