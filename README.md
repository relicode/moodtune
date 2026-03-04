# Moodtune

A venue music management app built with Next.js 16, React 19, and MUI 7. Admins create venues and organize music into nested folder/playlist hierarchies. Venue users browse and play tracks from assigned venues.

## Prerequisites

- Node.js 24+ (see `.nvmrc`)
- Docker and Docker Compose (for Redis and MinIO)

## Getting Started

1. Start the backing services:

   ```sh
   docker compose up redis minio
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
    icon.tsx            Programmatic favicon (32px, via ImageResponse)
    apple-icon.tsx      Programmatic apple-touch-icon (180px)
    icons/[size]/       Dynamic PNG icon route for manifest (192px, 512px)
    manifest.ts         Web app manifest (PWA metadata)
    venue/              Venue user views
      [venueId]/        Venue root (branch grid)
        [branchId]/     Folder or playlist view
  actions/              Server Actions (admin, auth, branches, media)
  components/           Shared components (AudioPlayer, BranchGrid, InstallButton, LoginForm, VenueBottomNav)
  data/                 Data access layer (dal.ts + entity modules for Redis/MinIO)
  lib/                  Utilities (session, ffprobe, ffmpeg, filename, logger, analytics, request, icon)
  proxy.ts              Middleware (JWT verification, route guards, sliding token refresh)
  types/                TypeScript type definitions
  theme.ts              MUI theme config
```

## Architecture

- **Data** is stored in Redis (branches, venues, users, sessions) and MinIO (audio files, images). The data layer (`src/data/dal.ts`) provides typed Redis helpers; entity modules build on this abstraction. All persistent data lives outside the project at `$DATA_DIR` (required, set in `.env`).
- **Branches** form a recursive tree: folders contain child branches, playlists contain tracks. Both folder name/image and playlist settings are editable after creation via admin dialogs.
- **Audio uploads** are streamed to disk and probed with ffprobe for metadata, then compressed to 192kbps AAC/M4A via ffmpeg when a meaningful size reduction (>20%) is expected. Static binaries for amd64 and arm64 are downloaded to `$DATA_DIR/bins/{arch}/` by the `postinstall` script. The app auto-detects the architecture via `process.arch` and checks `/data/bins/{arch}/` (container) before falling back to system PATH (dev). Max upload size is 2048 MB. Temp directory is `/data/uploads` in production and `/tmp` in dev (determined by `NODE_ENV`).
- **Auth** uses JWT sessions (12-hour lifetime with sliding refresh) stored in cookies. A single login page at `/` handles both admin and venue-user roles. `src/proxy.ts` guards `/admin` (admin role) and `/venue/[venueId]` (venue access) routes.
- **AudioPlayer** fills available viewport height. Controls are vertically centered when the track list is hidden; when visible, the track list pushes the controls up and scrolls independently via `flex: 1` + `overflow: auto`.
- The app uses `output: 'standalone'` for containerized deployment.
- **Logging** uses pino for structured JSON logging. In production, logs write to `/data/log/app.log`; in dev, logs go to stdout only via `pino-pretty`. Set `LOG_LEVEL` env var to control verbosity (defaults to `debug` in dev, `info` in production). Covers auth, route guards, admin actions, uploads, streaming, and analytics.
- **Analytics** (optional): set `NEXT_PUBLIC_UMAMI_URL` and `NEXT_PUBLIC_UMAMI_WEBSITE_ID` in `.env` to enable Umami page-view tracking. Client analytics (`src/lib/analytics.ts`) sends events to both Umami and the server-side `/api/analytics` endpoint for structured logging. Events include playback (`track-play`, `track-pause`, `track-skip`, `track-complete`), auth (`auth-login-failure`, `auth-logout`), PWA (`pwa-install-prompt`, `pwa-installed`), and admin CRUD actions. The server endpoint validates events against an allowlist and sanitizes all values before logging.
- **PWA** — The app is installable as a Progressive Web App. A web app manifest (`src/app/manifest.ts`) provides identity, theme colors, and icon references. Icons are generated programmatically using `next/og` `ImageResponse` (white MusicNote on the primary theme color) at multiple sizes: 32px favicon, 180px apple-touch-icon, and 192/512px for the manifest via a dynamic route at `/icons/[size]`. A `ServiceWorkerProvider` captures the browser's install prompt and a placeholder service worker (`public/sw.js`) is registered on mount. The `InstallButton` component shows a responsive install icon on the login page when the app is installable.

## Docker

The app is built on the host and volume-mounted into a stock `node:24-slim` container (no Dockerfile). `compose.yaml` defines all services with production settings (healthchecks, resource limits, moodtune network). All data volumes are mapped from `$DATA_DIR` (required).

```sh
docker compose up redis minio       # Dev: just the backing services
./deploy.sh                         # Production: build on host, restart app container
./prod.sh up -d                     # Full stack (compose validates required env vars)
```

- **Redis** on port 6379 (persistent with AOF)
- **MinIO** on port 9000 (API only, no console in production)
- The app service is named `moodtune-app`, bound to `127.0.0.1:3333`

## Production Deployment

`prod.sh` runs the root `~/services/compose.yaml` which includes moodtune via Docker Compose `include` alongside Caddy and Umami. Required env vars (`JWT_SECRET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`) are validated at startup via `${VAR:?}` interpolation in `compose.yaml`. Caddy reverse proxies to `moodtune-app:3000` on a shared `moodtune` network.

**Seed in production** — Redis is bound to `127.0.0.1:6379` (no password), so `npm run db:seed` works from the host.

## License

MIT
