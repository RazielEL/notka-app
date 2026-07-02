# Notka

Notka is a minimal self-hosted notes app for Markdown notes, checklists, shared group notes, alerts, and everyday organization.

It is designed for private self-hosted use, especially behind Tailscale or another private network. App login is still required.

## Features

- Markdown notes with live preview
- Checklists with progress indicators
- Personal notes and shared group notes
- Folders and nested folders
- Pinned notes
- Built-in templates and custom templates
- Alerts and calendar view
- English and Polish interface
- Light/dark mode, color themes, and font preferences
- Responsive desktop and mobile layout
- SQLite metadata with Markdown files on disk
- Docker Compose deployment

## Docker Quick Start

Create a `.env` file:

```env
NOTKA_HOST_PORT=13379
SESSION_SECRET=replace-with-a-long-random-secret
SESSION_COOKIE_SECURE=false
DATA_DIR=/data
```

Generate a stable session secret:

```bash
openssl rand -base64 48
```

Start the app from the source checkout:

```bash
docker compose up -d --build
```

Open:

```text
http://localhost:13379
```

On first launch, Notka guides you through creating the first admin account.

## GHCR Docker Image

To deploy without building locally, use the published GitHub Container Registry image:

```yaml
services:
  notka:
    image: ghcr.io/razielel/notka-app:latest
    container_name: notka
    restart: unless-stopped
    env_file: .env
    ports:
      - "${NOTKA_HOST_PORT:-13379}:3000"
    volumes:
      - ./data:/data
```

Or use the included GHCR compose file:

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

## Local Build

The default `docker-compose.yml` builds the image from this repository:

```bash
docker compose up -d --build
```

For local app development without Docker:

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NOTKA_HOST_PORT` | No | Host port exposed by Docker Compose. Defaults to `13379`. |
| `SESSION_SECRET` | Yes | Long stable secret used to sign sessions. Changing it invalidates existing sessions. |
| `SESSION_COOKIE_SECURE` | No | Set to `true` only when serving Notka over HTTPS. Keep `false` for private HTTP over Tailscale. |
| `DATA_DIR` | No | Persistent data directory inside the container. Defaults to `/data` in Docker examples. |

## Private Network Recommendation

Notka is intended for private self-hosted or Tailscale-style deployment.

Recommended setup:

- Run it behind Tailscale, WireGuard, VPN, or another private network
- Keep app login enabled
- Use HTTPS if exposing it through a public domain
- Set `SESSION_COOKIE_SECURE=true` when using HTTPS
- Do not expose it directly to the public internet without HTTPS, a reverse proxy, request limits, monitoring, and rate limiting

After first setup, anyone who can access the instance can register an account from the login screen.

## Backup

All persistent app data is stored in the mounted `./data` directory by default.

Recommended simple backup flow:

```bash
docker compose down
tar -czf notka-data-backup-$(date +%F).tar.gz ./data
docker compose up -d
```

Keep backups outside the app directory if the notes matter.

## Updating

When using the GHCR image:

```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

When building locally:

```bash
git pull
docker compose up -d --build
```

Optionally remove old unused images:

```bash
docker image prune -f
```

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

MIT
