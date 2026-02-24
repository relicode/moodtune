# Moodtune

A venue music management app built with Next.js 16, React 19, and MUI 7. Admins create venues and organize music into nested folder/playlist hierarchies. Venue users browse and play tracks from assigned venues.

## Prerequisites

- Node.js 24+ (see `.nvmrc`)
- Docker and Docker Compose (for Redis and MinIO)

## Getting Started

1. Start the backing services:

   ```sh
   docker compose up -d
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Copy the environment template and adjust as needed:

   ```sh
   cp env-template .env
   ```

4. Seed the database (creates admin user and MinIO buckets). `ADMIN_USERNAME` and `ADMIN_PASSWORD` must be set in `.env`:

   ```sh
   npm run db:seed
   ```

5. Start the dev server:

   ```sh
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Script                    | Description                             |
| ------------------------- | --------------------------------------- |
| `npm run dev`             | Start dev server (Turbopack)            |
| `npm run build`           | Production build                        |
| `npm start`               | Start production server                 |
| `npm run db:seed`         | Seed admin user and MinIO buckets       |
| `npm run db:delete`       | Remove all Redis data                   |
| `npm run db:reset`        | Delete then seed                        |
| `npm run show-redis`      | Inspect Redis contents                  |
| `npm run lint`            | ESLint                                  |
| `npm run lint:typescript` | Type-check (`tsc --noEmit`)             |
| `npm run lint:prettier`   | Check formatting                        |
| `npm run format`          | Auto-fix ESLint + Prettier              |
| `npm run test`            | All tests (unit + e2e)                  |
| `npm run test:unit`       | Unit tests (vitest)                     |
| `npm run test:e2e`        | E2E tests (requires dev server running) |

## Project Structure

```
src/
  app/                  App Router pages and layouts
    admin/              Admin dashboard (page, layout, and CRUD components)
    api/                REST API routes
      admin/            Admin CRUD (branches, tracks, track, image, venue-users)
      analytics/        Client analytics relay (auth required, logs to pino)
      audio/            Audio streaming with range-request support
      image/            Image proxy (streams from MinIO, auth required)
      playlist/         Playlist tracks with role-based filtering
    venue/              Venue user views
      [venueId]/        Venue root (branch grid)
        [branchId]/     Folder or playlist view
  actions/              Server Actions (admin, auth, branches, media)
  components/           Shared components (AudioPlayer, BranchGrid, LoginForm, VenueBottomNav)
  data/                 Data access layer (dal.ts + entity modules for Redis/MinIO)
  lib/                  Utilities (session, ffprobe, ffmpeg, filename, logger, analytics, request)
  proxy.ts              Middleware (JWT verification, route guards, sliding token refresh)
  types/                TypeScript type definitions
  theme.ts              MUI theme config
```

## Architecture

- **Data** is stored in Redis (branches, venues, users, sessions) and MinIO (audio files, images). The data layer (`src/data/dal.ts`) provides typed Redis helpers; entity modules build on this abstraction.
- **Branches** form a recursive tree: folders contain child branches, playlists contain tracks. Both folder name/image and playlist settings are editable after creation via admin dialogs.
- **Audio uploads** are streamed to disk and probed with `ffprobe-static` for metadata, then compressed to 192kbps AAC/M4A via `ffmpeg-static` when a meaningful size reduction (>20%) is expected. Max upload size is 2048 MB. Temp directory is configurable via `UPLOAD_TMP_DIR` (defaults to `/var/tmp`).
- **Auth** uses JWT sessions (12-hour lifetime with sliding refresh) stored in cookies. A single login page at `/` handles both admin and venue-user roles. `src/proxy.ts` guards `/admin` (admin role) and `/venue/[venueId]` (venue access) routes.
- **AudioPlayer** fills available viewport height. Controls are vertically centered when the track list is hidden; when visible, the track list pushes the controls up and scrolls independently via `flex: 1` + `overflow: auto`.
- The app uses `output: 'standalone'` for containerized deployment.
- **Logging** uses pino for structured JSON logging to `./data/log/app.log` (plus `pino-pretty` to stdout in dev). Set `LOG_LEVEL` env var to control verbosity (defaults to `debug` in dev, `info` in production). Covers auth, route guards, admin actions, uploads, streaming, and analytics.
- **Analytics** (optional): set `NEXT_PUBLIC_UMAMI_URL` and `NEXT_PUBLIC_UMAMI_WEBSITE_ID` in `.env` to enable Umami page-view tracking. The AudioPlayer also sends `track-play`, `track-complete`, and `track-skip` events to both Umami and the server-side `/api/analytics` endpoint for structured logging.

## Docker Compose

```sh
docker compose up -d                # Redis + MinIO (dev)
npm run build                       # Build standalone output on host
docker compose --profile app up -d  # Run the app container (dev)
```

- **Redis** on port 6379 (persistent with AOF)
- **MinIO** on port 9000 (API) / 9001 (console)
- The app service is named `moodtune-app`

## Production Deployment

Production is managed from the root `~/services/compose.yaml`, which includes moodtune via Docker Compose `include`:

```yaml
# In ~/services/compose.yaml
include:
  - path:
      - ./moodtune/compose.yaml
      - ./moodtune/compose.production.yaml
    project_directory: ./moodtune
    env_file: ./moodtune/.env
```

The root compose also defines Caddy and a shared `caddy` network. Moodtune's production overlay joins this network so Caddy can reverse proxy to `moodtune-app:3000`.

**Required changes in `~/services/Caddyfile`:**

```
moodtune.siren.codes {
  reverse_proxy moodtune-app:3000
  # Plus: security headers, exploit/bot blocking, access logging
}
```

**Required changes in `~/services/compose.yaml`:**

- Caddy must join the `caddy` network (`networks: [default, caddy]`)
- Define the `caddy` network with `name: caddy`

**Deploy:**

```sh
cd ~/services
npm run build --prefix ./moodtune   # Build standalone output
docker compose up -d                # Start everything (Caddy, moodtune, Redis, MinIO)
```

**Seed in production** — Redis is bound to `127.0.0.1:6379` (no password), so `npm run db:seed` works from the host.

`prod.sh` can still be used for standalone operation (validates `JWT_SECRET`).

## License

MIT
