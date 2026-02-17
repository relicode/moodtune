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
   cp env-template .env.local
   ```

4. Seed the database (creates admin user and MinIO buckets):

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
      admin/            Admin CRUD (branches, tracks, upload-track, venue-users)
      audio/            Audio streaming with range-request support
      playlist/         Playlist tracks with role-based filtering
    venue/              Venue user views
      [venueId]/        Venue root (branch grid)
        [branchId]/     Folder or playlist view
  actions/              Server Actions (admin, auth, branches, media)
  components/           Shared components (AudioPlayer, BranchGrid, LoginForm, VenueBottomNav)
  data/                 Data access layer (dal.ts + entity modules for Redis/MinIO)
  lib/                  Utilities (session, ffprobe, ffmpeg, filename)
  proxy.ts              Middleware (JWT verification, route guards, sliding token refresh)
  types/                TypeScript type definitions
  theme.ts              MUI theme config
```

## Architecture

- **Data** is stored in Redis (branches, venues, users, sessions) and MinIO (audio files, images). The data layer (`src/data/dal.ts`) provides typed Redis helpers; entity modules build on this abstraction.
- **Branches** form a recursive tree: folders contain child branches, playlists contain tracks.
- **Audio uploads** are probed with `ffprobe-static` for metadata and compressed to 192kbps AAC/M4A via `ffmpeg-static` when a meaningful size reduction (>20%) is expected. Max upload size is 100 MB.
- **Auth** uses JWT sessions (12-hour lifetime with sliding refresh) stored in cookies. A single login page at `/` handles both admin and venue-user roles. `src/proxy.ts` guards `/admin` (admin role) and `/venue/[venueId]` (venue access) routes.
- The app uses `output: 'standalone'` for containerized deployment.

## Docker Compose

```sh
docker compose up -d          # Redis + MinIO
docker compose --profile app up  # Also build and run the app container
```

- **Redis** on port 6379 (persistent with AOF)
- **MinIO** on port 9000 (API) / 9001 (console)

## License

MIT
