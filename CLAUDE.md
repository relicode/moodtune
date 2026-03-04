# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moodtune is a Next.js 16 application using React 19 and MUI 7. It uses the App Router with standalone output mode and React Compiler enabled.

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint only
- `npm run lint:typescript` — type-check (`tsc --noEmit`)
- `npm run lint:prettier` — check formatting
- `npm run format` — auto-fix ESLint + Prettier
- `npm run test` — all tests (unit + e2e)
- `npm run test:unit` — unit tests (vitest)
- `npm run test:e2e` — end-to-end tests (requires dev server running)
- `npm run db:seed` — seed admin user and MinIO buckets
- `npm run db:delete` — remove all Redis data
- `npm run db:reset` — delete then seed
- `npm run show-redis` — inspect Redis contents

## Environment Setup

Copy `env-template` to `.env`. Node version: 24.11.1 (see `.nvmrc`).

Required env vars include `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, Redis connection, and MinIO connection (`MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, etc.). The seed script requires `ADMIN_USERNAME` and `ADMIN_PASSWORD` (no hardcoded fallbacks). `DATA_DIR` (required for Compose) sets the base path for volume mounts (logs, uploads, bins, Redis, MinIO) — kept outside the project to avoid Turbopack scanning issues. The app itself uses fixed `/data/*` paths in production and sensible defaults (`/tmp`, stdout) in dev — no directory env vars needed.

## Architecture

- **`src/app/`** — Next.js App Router pages and layouts
  - **`src/app/api/`** — REST API routes (admin CRUD, audio streaming, playlist)
  - **`src/app/admin/`** — Admin dashboard page, layout, and components (dialog-based CRUD for venues, branches, tracks, users). `DialogEditBranch` edits folder name/image; `DialogEditPlaylist` edits playlist settings and tracks.
- **`src/actions/`** — Server Actions (`admin.ts`, `auth.ts`, `branches.ts`) and utilities (`media.ts` — synchronous image proxy URL builder)
- **`src/components/`** — Shared React components (`AudioPlayer`, `BranchGrid`, `InstallButton`, `LoginForm`, `VenueBottomNav`)
- **`src/data/`** — Data access layer built on `dal.ts` (thin Redis abstraction with UUID gen, typed serialization); modules for branches, tracks, venues, users, redis, minio
- **`src/hooks/`** — Custom React hooks (`useSnackbar` — shared snackbar context via `SnackbarProvider` in ThemeRegistry; `useServiceWorker` — `beforeinstallprompt` capture and service worker registration via `ServiceWorkerProvider` in ThemeRegistry)
- **`src/lib/`** — Shared utilities (`session.ts`, `ffprobe.ts`, `ffmpeg.ts`, `filename.ts`, `paths.ts`, `stream.ts`, `utils.ts`, `logger.ts`, `analytics.ts`, `request.ts`, `icon.tsx`)
- **`src/proxy.ts`** — Middleware: JWT verification, route guards (`/admin` requires admin role, `/venue/[venueId]` requires venue access), sliding token refresh
- **`src/types/`** — TypeScript type definitions
- **`src/theme.ts`** — MUI theme config (CSS variables, light/dark color schemes, Inter font)

Path alias: `$/*` maps to `./src/*` (e.g., `import Foo from '$/components/Foo'`).

## API Routes

- `GET/POST /api/admin/branches/[venueId]` — branch CRUD scoped by venue
- `GET/POST /api/admin/tracks/[branchId]` — track CRUD scoped by branch; `?pool=random` returns random tracks
- `POST /api/admin/track` — audio file upload with metadata extraction and optional compression; `pool=random` field stores in random pool
- `POST /api/admin/image` — image file upload; streams to disk, uploads to MinIO, returns `{ imagePath }`
- `GET/POST/DELETE /api/admin/venue-users/[venueId]` — manage venue user assignments
- `GET /api/audio/[branchId]/[trackId]` — stream audio from MinIO (supports range requests)
- `GET /api/image/[...path]` — proxy images from MinIO through the server (auth required, path-traversal protected)
- `GET /api/playlist/[playlistId]` — playlist tracks with role-based filtering
- `POST /api/analytics` — client-side track analytics relay (auth required, validates event names against allowlist, logs to pino)
- `GET /icons/[size]` — dynamically generated PNG app icon at the requested pixel size (16–1024); used by the manifest for 192px and 512px icons

## PWA

- **Manifest** (`src/app/manifest.ts`) — Next.js metadata route exporting `MetadataRoute.Manifest` with app identity (`id: '/'`), standalone display, theme colors from `src/theme.ts`, and icon references to `/icons/192` and `/icons/512`.
- **Viewport** — Exported from `src/app/layout.tsx` with `device-width`, light/dark `themeColor` matching the MUI theme palette.
- **Icons** — Programmatically generated via `next/og` `ImageResponse` (Satori). A shared generator in `src/lib/icon.tsx` renders a white MusicNote SVG on the primary theme color (`#00796B`). Consumed by `src/app/icon.tsx` (32px favicon), `src/app/apple-icon.tsx` (180px apple-touch-icon), and `src/app/icons/[size]/route.ts` (dynamic sizes for the manifest).
- **Service worker** — `public/sw.js` is a placeholder (console log only). Registered by `ServiceWorkerProvider` in `src/hooks/useServiceWorker.tsx`.
- **Install prompt** — `ServiceWorkerProvider` captures the `beforeinstallprompt` event (with an early module-level listener to avoid race conditions before React mounts) and exposes `deferredPrompt` via context. `InstallButton` (`src/components/InstallButton.tsx`) renders a responsive install icon (desktop/mobile) next to the login title; hidden when the app is not installable or already installed. Shows a snackbar on successful install.

## Auth and Sessions

- JWT-based sessions (`jose` library), cookie name `moodtune-session`
- 12-hour session lifetime with sliding refresh (refreshes when >50% elapsed)
- Single unified login page at `/` — the `login` server action handles both admin and venue-user roles, redirecting admins to `/admin` and venue users to `/venue/[venueId]`
- `src/proxy.ts` enforces route guards; individual API routes also verify sessions via `getSessionFromCookie()`

## Logging

- **Pino** structured logging via `src/lib/logger.ts`. Import with `import { createLogger } from '$/lib/logger'` and create module-scoped loggers: `const log = createLogger('module-name')`.
- Production: logs are written to `/data/log/app.log` (JSON format, directory auto-created). Dev: logs to stdout only via `pino-pretty` (no file transport).
- Log level defaults to `debug` in dev and `info` in production; override with the `LOG_LEVEL` env var.
- The logger singleton is cached on `globalThis` to avoid duplicate pino transport workers during Next.js hot-reload.
- Logging covers: auth (login/logout with IP), proxy route guards, admin actions, file uploads, audio streaming, DAL writes, ffmpeg/ffprobe, and client analytics relay.
- Failed login attempts log the attempted password (intentional for security auditing).

## Analytics

- **Umami** (optional) for client-side page-view and event analytics. Configured via `NEXT_PUBLIC_UMAMI_URL` and `NEXT_PUBLIC_UMAMI_WEBSITE_ID` env vars. The script tag is conditionally rendered in `src/app/layout.tsx`.
- **Client analytics** (`src/lib/analytics.ts`) provides `track(event, data?)` and `identify(username)` functions. `track` sends events to both the server-side `/api/analytics` endpoint and Umami. `identify` sets the Umami user identity. The `AnalyticsIdentify` component (`src/components/AnalyticsIdentify.tsx`) calls `identify` on mount in both the venue and admin layouts.
- **Analytics events**: Playback: `track-play`, `track-pause`, `track-skip`, `track-complete`. Auth: `auth-login-failure`, `auth-logout`. PWA: `pwa-install-prompt`, `pwa-installed`. Admin: `admin-venue-create`, `admin-venue-update`, `admin-venue-delete`, `admin-branch-create`, `admin-branch-update`, `admin-branch-delete`, `admin-playlist-update`, `admin-track-upload`, `admin-track-update`, `admin-track-delete`, `admin-user-create`, `admin-user-delete`.
- **Server analytics endpoint** (`POST /api/analytics`) requires authentication, validates event names against an allowlist (`ALLOWED_EVENTS`), sanitizes untrusted values (truncates strings, filters to string/number/boolean types), and logs structured data via pino.
- **Type declarations** for the Umami global are in `src/types/umami.d.ts`.
- **IP extraction** utility at `src/lib/request.ts` reads `x-forwarded-for` (first hop) or `x-real-ip` for logging behind reverse proxies. Caddy is configured to override both `X-Forwarded-For` and `X-Real-IP` with `{remote_host}` to prevent client spoofing (see `~/services/Caddyfile`).

## Key Technical Details

- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts):
  - Never use `useMemo`, `useCallback`, or `React.memo` — the compiler handles memoization automatically
  - Never access refs during render — only read/write `ref.current` in event handlers or effects
  - Never call setState synchronously inside effects — use inline async with a cancellation flag instead
  - The `react-hooks/exhaustive-deps` ESLint rule does not understand compiler memoization; functions defined in component scope are stable at runtime, so omitting them from dependency arrays is safe (add a `// stable via React Compiler` comment)
- **MUI 7** with Emotion — the ThemeRegistry is at `$/app/ThemeRegistry`; import MUI components individually (e.g., `import Button from '@mui/material/Button'`)
- **Prettier** config: no semicolons, single quotes, trailing commas (es5), 120 char width, import sorting via `@ianvs/prettier-plugin-sort-imports`
- **ESLint** uses flat config with `eslint-config-next` (core-web-vitals + typescript)
- **Audio processing** — `src/lib/ffprobe.ts` extracts metadata; `src/lib/ffmpeg.ts` compresses uploads to 192kbps AAC/M4A when a >20% size reduction is expected. Static binaries for amd64 and arm64 are downloaded to `$DATA_DIR/bins/{arch}/` by the `postinstall` script. At runtime, `src/lib/paths.ts` resolves the binary by checking `/data/bins/{arch}/` (container mount) then falling back to the system PATH (dev). Both accept a file path — the caller manages the temp file lifecycle. Uploads stream to disk (`/data/uploads` in production, `/tmp` in dev). Max upload size: 2048 MB. The `FFMPEG_MAX_BUFFER` env var controls the stdout/stderr buffer limit for ffmpeg/ffprobe child processes (default: 10 MB).
- **Data layer** — `src/data/dal.ts` provides typed Redis helpers (UUID generation, hset/hgetall with serialization). Entity modules (`branches.ts`, `tracks.ts`, `venues.ts`, `users.ts`) build on the DAL. Branches form a recursive tree: folders contain child branches, playlists contain tracks. Playlists also have a separate random-track pool (`branch:<id>:randomTracks`) and a `random` probability (0-100) controlling how many random tracks get injected at playback.
- **Audio playback** — The `AudioPlayer` component (`src/components/AudioPlayer.tsx`) integrates with the Media Session API for lock screen / OS media controls on Android and Desktop (iOS PWAs cannot background audio). It sets track metadata (title, artist, album, artwork via `/icons/[size]`), registers play/pause/next/previous/stop/seekto action handlers, syncs playback state, and reports position for the OS progress bar. A hidden `<audio preload="auto">` element preloads the next track for instant transitions. All Media Session code is feature-detected (`'mediaSession' in navigator`) for older browser compatibility.
- **Venue layout** — The venue layout (`src/app/venue/[venueId]/layout.tsx`) uses a flex column with an `overflow: auto` scroll container. Playlist pages opt out of page-level scrolling by threading `minHeight: 0` through the flex chain (layout Container → page Stack → AudioPlayer Container), allowing the AudioPlayer to fill available height. The AudioPlayer uses conditional `justifyContent: 'center'` when the track list is hidden; when visible, the track list gets `flex: 1` + `overflow: auto` to scroll independently.
- **Docker** — No Dockerfile; the app is built on the host and the standalone output is volume-mounted into a stock `node:24-slim` container. `compose.yaml` defines all services (app, Redis, MinIO) with production settings (healthchecks, resource limits, moodtune network). For dev, run `docker compose up redis minio` and use `npm run dev` on the host. For production, run `./deploy.sh` to build and restart the app container, or `./prod.sh up -d` to start the full stack (moodtune + Caddy + Umami) via the root `~/services/compose.yaml`. Required env vars (`JWT_SECRET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`) are validated at startup via `${VAR:?}` interpolation in `compose.yaml`.
- **Production deployment** — The root `~/services/compose.yaml` includes moodtune via the `include` directive. The app is bound to `127.0.0.1:3333`, all services to localhost, with resource limits (2 CPUs, 1.5 GB RAM). A shared `moodtune` named network connects the moodtune app to the Caddy reverse proxy defined in the root compose.
- **Reverse proxy** — Caddy (configured in `~/services/Caddyfile`) serves `moodtune.siren.codes` with automatic TLS via Let's Encrypt, proxying to `moodtune-app:3000` on the shared `moodtune` network. The Caddyfile includes security headers (HSTS, X-Content-Type-Options, Referrer-Policy), exploit path blocking, bot user-agent blocking, JSON access logging to `/var/log/caddy/moodtune-access.log`, and sets `X-Forwarded-For`/`X-Real-IP` headers for accurate client IP logging.
- **Data directory** — All persistent data (Redis, MinIO, logs, uploads, ffmpeg bins) lives outside the project tree at `$DATA_DIR` (required). This avoids Turbopack scanning issues during builds. Compose validates `DATA_DIR` at startup via `${DATA_DIR:?}`.
- **Production seeding** — Redis is bound to `127.0.0.1:6379` (no password), so `npm run db:seed` works from the host.
- **Scripts** — All scripts in `scripts/` use `@next/env` `loadEnvConfig` to load `.env` automatically. The seed script requires `ADMIN_USERNAME` and `ADMIN_PASSWORD` to be set (exits with an error if missing). The `postinstall` script reads `DATA_DIR` from `.env` via sed (does not source the file).

## Testing

- **Unit tests** (`__tests__/*.test.ts`) — vitest, covers ffprobe metadata extraction and filename parsing
- **E2E tests** (`__tests__/e2e/*.test.ts`) — vitest with 30s timeout, requires dev server running; covers audio streaming, branches, playlists, tracks, users, venues
- **Test data** — `__tests__/test-data/` contains sample audio files in multiple formats (mp3, m4a, wav, flac, ogg, opus, webm)
