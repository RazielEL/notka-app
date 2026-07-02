# Notka

Notka is a minimal self-hosted notes app for Markdown notes, checklists, shared group notes, alerts, calendar planning, and simple everyday organization.

It is built for private self-hosted use, with Docker-first deployment and persistent local storage.

Notes and checklists are the same thing: a checklist is just Markdown using `- [ ]` and `- [x]`.

## Features

- Markdown notes with live preview
- Checklist support with progress indicators
- Personal notes
- Shared group notes for all registered users
- Folder organization with nested folders
- Pinned notes
- Built-in templates and custom templates
- Note alerts and calendar view
- English and Polish interface
- Light and dark mode
- Multiple color themes
- Font preferences
- Responsive desktop and mobile layout
- PWA manifest support
- SQLite metadata with Markdown files on disk
- Docker Compose deployment

## Quick Start With Docker

Create a `docker-compose.yml` file:

```yaml
services:
  notka:
    image: ghcr.io/razielel/notka-app:latest
    container_name: notka
    restart: unless-stopped
    ports:
      - "13379:3000"
    environment:
      DATA_DIR: /data
      SESSION_SECRET: "replace-with-a-long-random-secret"
      SESSION_COOKIE_SECURE: "false"
    volumes:
      - ./data:/data
```

Start Notka:

```bash
docker compose up -d
```

Open:

```text
http://localhost:13379
```

On first launch, Notka will guide you through creating the first admin account.

## Session Secret

`SESSION_SECRET` is required for Docker and production. Generate a long stable value:

```bash
openssl rand -base64 48
```

Put it in your compose file or `.env` file:

```env
SESSION_SECRET=your-long-random-secret
```

Keep this value stable across restarts. Changing it will invalidate existing sessions.

## Using An Env File

Instead of putting environment variables directly in `docker-compose.yml`, you can use `.env`:

```env
NOTKA_HOST_PORT=13379
SESSION_SECRET=your-long-random-secret
SESSION_COOKIE_SECURE=false
DATA_DIR=/data
```

Example compose file:

```yaml
services:
  notka:
    image: ghcr.io/razielel/notka-app:latest
    container_name: notka
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "${NOTKA_HOST_PORT:-13379}:3000"
    volumes:
      - ./data:/data
```

## Tailscale Or Private Network Deployment

Notka is designed to work well behind a private network such as Tailscale.

For a private HTTP deployment over Tailscale, keep:

```env
SESSION_COOKIE_SECURE=false
```

If you serve Notka through HTTPS, set:

```env
SESSION_COOKIE_SECURE=true
```

To bind Notka only to a Tailscale IP, use:

```yaml
ports:
  - "100.x.y.z:13379:3000"
```

Replace `100.x.y.z` with your server's Tailscale IP.

## Data Storage

All persistent data lives in the mounted `/data` directory.

This includes:

- SQLite database
- Markdown note files
- Deleted notes
- Templates
- App metadata

With the default Docker Compose setup, this is stored on the host in:

```text
./data
```

Do not mount or serve `./data` through a web server. It contains SQLite data, Markdown files, trash, templates, and session metadata.

## Backup

Recommended simple backup flow:

```bash
docker compose down
tar -czf notka-data-backup-$(date +%F).tar.gz ./data
docker compose up -d
```

Back up the whole `data/` directory together so `app.db`, `app.db-wal`, Markdown notes, trash, and templates stay consistent.

## Updating

Pull the newest image and restart:

```bash
docker compose pull
docker compose up -d
```

Optionally clean old images:

```bash
docker image prune -f
```

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open:

```text
http://localhost:3000
```

The development script stores local data in `./data`. Docker and production use `DATA_DIR=/data`.

## Useful Scripts

```bash
pnpm dev       # start the development server
pnpm build     # production build
pnpm start     # start a production server after build
pnpm lint      # run Next.js linting
pnpm typecheck # run TypeScript checks
```

Reset local development data:

```bash
pnpm db:reset:dev -- --yes
```

This is destructive. It removes local app data, including notes and the SQLite database.

## Security Notes

Notka is intended for private self-hosted use.

Recommended setup:

- Run it behind Tailscale or another private network
- Keep app login enabled
- Use HTTPS if exposing it through a public domain
- Set `SESSION_COOKIE_SECURE=true` when using HTTPS
- Do not serve the `data/` directory directly
- Back up the entire `data/` directory consistently

Public internet exposure should use additional hardening such as HTTPS, reverse proxy protection, request limits, monitoring, and stronger abuse protection.

## Current Limitations

- Group Notes are shared with all registered users on the instance.
- Note edits are currently last-write-wins.
- There is no real-time collaborative editing.
- Registration is available to anyone who can access the instance after first setup.
- Notka is designed for private self-hosted environments, not public SaaS-style hosting.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- SQLite
- Drizzle ORM
- Markdown files
- Docker

## License

TBD
