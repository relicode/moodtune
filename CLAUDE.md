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

## Environment Setup

Copy `env-template` to `.env.local`. Node version: 24.11.1 (see `.nvmrc`).

## Architecture

- **`src/app/`** — Next.js App Router pages and layouts
- **`src/actions/`** — Server Actions
- **`src/components/`** — Shared React components
- **`src/data/`** — Data access layer
- **`src/hooks/`** — Custom React hooks
- **`src/lib/`** — Shared utilities and library code
- **`src/types/`** — TypeScript type definitions
- **`src/theme.ts`** — MUI theme config (CSS variables, light/dark color schemes, Inter font)

Path alias: `$/*` maps to `./src/*` (e.g., `import Foo from '$/components/Foo'`).

## Key Technical Details

- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts):
  - Never use `useMemo`, `useCallback`, or `React.memo` — the compiler handles memoization automatically
  - Never access refs during render — only read/write `ref.current` in event handlers or effects
  - Never call setState synchronously inside effects — use inline async with a cancellation flag instead
  - The `react-hooks/exhaustive-deps` ESLint rule does not understand compiler memoization; functions defined in component scope are stable at runtime, so omitting them from dependency arrays is safe (add a `// stable via React Compiler` comment)
- **MUI 7** with Emotion — the ThemeRegistry is at `$/app/ThemeRegistry`; import MUI components individually (e.g., `import Button from '@mui/material/Button'`)
- **Prettier** config: no semicolons, single quotes, trailing commas (es5), 120 char width, import sorting via `@ianvs/prettier-plugin-sort-imports`
- **ESLint** uses flat config with `eslint-config-next` (core-web-vitals + typescript)
- **Docker Compose** provides Redis and an optional app container (`docker compose --profile app up`)
