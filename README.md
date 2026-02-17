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
   npm run seed
   ```

5. Start the dev server:

   ```sh
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run seed` | Seed admin user and MinIO buckets |
| `npm run lint` | ESLint |
| `npm run lint:typescript` | Type-check (`tsc --noEmit`) |
| `npm run lint:prettier` | Check formatting |
| `npm run format` | Auto-fix ESLint + Prettier |

## Project Structure

```
src/
  app/              App Router pages and layouts
    admin/          Admin dashboard
    admin-login/    Admin login page
    venue/          Venue user views
      [venueId]/    Venue root (branch grid)
        [branchId]/ Folder or playlist view
  actions/          Server Actions
  components/       Shared React components
  data/             Data access layer (Redis, MinIO)
  lib/              Shared utilities
  types/            TypeScript type definitions
```

## Architecture

- **Data** is stored in Redis (branches, venues, users, sessions) and MinIO (audio files, images).
- **Branches** form a recursive tree: folders contain child branches, playlists contain tracks.
- **Auth** uses JWT sessions stored in cookies. Admins and venue users have separate login flows.
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
