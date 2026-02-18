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

Required env vars include `JWT_SECRET`, Redis connection, and MinIO connection (`MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, etc.).

## Architecture

- **`src/app/`** — Next.js App Router pages and layouts
  - **`src/app/api/`** — REST API routes (admin CRUD, audio streaming, playlist)
  - **`src/app/admin/`** — Admin dashboard page, layout, and components (dialog-based CRUD for venues, branches, tracks, users)
- **`src/actions/`** — Server Actions (`admin.ts`, `auth.ts`, `branches.ts`) and utilities (`media.ts` — synchronous image proxy URL builder)
- **`src/components/`** — Shared React components (`AudioPlayer`, `BranchGrid`, `LoginForm`, `VenueBottomNav`)
- **`src/data/`** — Data access layer built on `dal.ts` (thin Redis abstraction with UUID gen, typed serialization); modules for branches, tracks, venues, users, redis, minio
- **`src/hooks/`** — Custom React hooks (`useSnackbar` — shared snackbar context via `SnackbarProvider` in ThemeRegistry)
- **`src/lib/`** — Shared utilities (`session.ts`, `ffprobe.ts`, `ffmpeg.ts`, `filename.ts`, `paths.ts`, `stream.ts`, `utils.ts`)
- **`src/proxy.ts`** — Middleware: JWT verification, route guards (`/admin` requires admin role, `/venue/[venueId]` requires venue access), sliding token refresh
- **`src/types/`** — TypeScript type definitions
- **`src/theme.ts`** — MUI theme config (CSS variables, light/dark color schemes, Inter font)

Path alias: `$/*` maps to `./src/*` (e.g., `import Foo from '$/components/Foo'`).

## API Routes

- `GET/POST /api/admin/branches/[venueId]` — branch CRUD scoped by venue
- `GET/POST /api/admin/tracks/[branchId]` — track CRUD scoped by branch; `?pool=random` returns random tracks
- `POST /api/admin/upload-track` — audio file upload with metadata extraction and optional compression; `pool=random` field stores in random pool
- `GET/POST/DELETE /api/admin/venue-users/[venueId]` — manage venue user assignments
- `GET /api/audio/[branchId]/[trackId]` — stream audio from MinIO (supports range requests)
- `GET /api/image/[...path]` — proxy images from MinIO through the server (auth required, path-traversal protected)
- `GET /api/playlist/[playlistId]` — playlist tracks with role-based filtering

## Auth and Sessions

- JWT-based sessions (`jose` library), cookie name `moodtune-session`
- 12-hour session lifetime with sliding refresh (refreshes when >50% elapsed)
- Single unified login page at `/` — the `login` server action handles both admin and venue-user roles, redirecting admins to `/admin` and venue users to `/venue/[venueId]`
- `src/proxy.ts` enforces route guards; individual API routes also verify sessions via `getSessionFromCookie()`

## Key Technical Details

- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts):
  - Never use `useMemo`, `useCallback`, or `React.memo` — the compiler handles memoization automatically
  - Never access refs during render — only read/write `ref.current` in event handlers or effects
  - Never call setState synchronously inside effects — use inline async with a cancellation flag instead
  - The `react-hooks/exhaustive-deps` ESLint rule does not understand compiler memoization; functions defined in component scope are stable at runtime, so omitting them from dependency arrays is safe (add a `// stable via React Compiler` comment)
- **MUI 7** with Emotion — the ThemeRegistry is at `$/app/ThemeRegistry`; import MUI components individually (e.g., `import Button from '@mui/material/Button'`)
- **Prettier** config: no semicolons, single quotes, trailing commas (es5), 120 char width, import sorting via `@ianvs/prettier-plugin-sort-imports`
- **ESLint** uses flat config with `eslint-config-next` (core-web-vitals + typescript)
- **Audio processing** — `ffprobe-static` and `ffmpeg-static` provide static binaries (both listed in `serverExternalPackages`). `src/lib/ffprobe.ts` extracts metadata; `src/lib/ffmpeg.ts` compresses uploads to 192kbps AAC/M4A when a >20% size reduction is expected. Both accept a file path — the caller manages the temp file lifecycle. Uploads stream to disk (`UPLOAD_TMP_DIR` env var, defaults to `/var/tmp`). Max upload size: 2048 MB.
- **Data layer** — `src/data/dal.ts` provides typed Redis helpers (UUID generation, hset/hgetall with serialization). Entity modules (`branches.ts`, `tracks.ts`, `venues.ts`, `users.ts`) build on the DAL. Branches form a recursive tree: folders contain child branches, playlists contain tracks. Playlists also have a separate random-track pool (`branch:<id>:randomTracks`) and a `random` probability (0-100) controlling how many random tracks get injected at playback.
- **Docker Compose** provides Redis, MinIO, and an optional app container (`docker compose --profile app up`)

## Testing

- **Unit tests** (`__tests__/*.test.ts`) — vitest, covers ffprobe metadata extraction and filename parsing
- **E2E tests** (`__tests__/e2e/*.test.ts`) — vitest with 30s timeout, requires dev server running; covers audio streaming, branches, playlists, tracks, users, venues
- **Test data** — `__tests__/test-data/` contains sample audio files in multiple formats (mp3, m4a, wav, flac, ogg, opus, webm)
