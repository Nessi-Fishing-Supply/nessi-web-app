# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nessi is an e-commerce web application built with Next.js 16 (App Router), Supabase Auth, Supabase PostgreSQL, and deployed on Vercel.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Lint styles:** `pnpm lint:styles`
- **Type check:** `pnpm typecheck`
- **Format:** `pnpm format` (write) / `pnpm format:check` (verify)
- **Test:** `pnpm test` (watch) / `pnpm test:run` (CI)
- **DB generate types:** `pnpm db:types`

Package manager is **pnpm** (v10.13.1). Do not use npm or yarn.

## Architecture

### Routing

Next.js App Router with a `(frontend)` route group for all UI pages. No Pages Router usage.

### Authentication

- **Cookie-based sessions** via `@supabase/ssr` — no localStorage
- **proxy.ts** refreshes Supabase sessions on every request
- **Server-side:** API routes use server client from `src/libs/supabase/server.ts` (user JWT from cookies)
- **Client-side:** Components use browser client from `src/libs/supabase/client.ts`
- **Admin operations:** Registration uses admin client from `src/libs/supabase/admin.ts` (bypasses RLS)
- `src/features/auth/context.tsx` provides `useAuth()` hook wrapping Supabase session state

### Database

- Supabase PostgreSQL accessed via `@supabase/supabase-js` + `@supabase/ssr`
- Three client utilities in `src/libs/supabase/`: browser (`client.ts`), server (`server.ts`), admin (`admin.ts`)
- Row Level Security (RLS) policies enforce access control at the database level
- Types generated from Supabase schema via `pnpm db:types` into `src/types/database.ts`

### File Storage

Image uploads use Supabase Storage (`product-images` bucket) via `src/app/api/products/upload/route.ts`. Images are stored under `{user_id}/{timestamp}.{ext}` paths with RLS policies enforcing per-user access.

### Key Directories

- `src/features/auth/` — Auth domain: services, types, validations, context, form components (see its CLAUDE.md)
- `src/features/products/` — Products domain: services, types, product display and form components (see its CLAUDE.md)
- `src/app/api/` — API routes (auth, products, upload)
- `src/app/(frontend)/` — UI pages (App Router with route group)
- `src/features/shared/` — Shared hooks (useForm, useFormState) and types (FormState)
- `src/components/` — Shared React components: controls, layout, navigation, indicators
- `src/types/` — Generated/infra types (database.ts)
- `src/libs/supabase/` — Supabase client utilities (browser, server, admin)
- `src/styles/` — SCSS with variables, mixins, and utilities

### Feature Organization

Domain-specific code lives in `src/features/{domain}/` with its own services, types, validations, and components. Each feature has a `CLAUDE.md` for AI-assisted context. Shared UI primitives remain in `src/components/`, shared hooks and types in `src/features/shared/`.

### State Management

- **Server state (data fetching):** Tanstack Query (`@tanstack/react-query`). All data fetching should use `useQuery`/`useMutation` hooks, not `useEffect` + `useState`. Query hooks live in `features/{domain}/hooks/`. The `QueryClientProvider` is configured in `src/libs/providers.tsx` with 60s default `staleTime`.
- **Client state (UI/app state):** Zustand for cross-component client state (cart, filters, multi-step flows). Stores live in `features/{domain}/stores/`. Use the `createSelectors` utility from `src/libs/create-selectors.ts` for auto-generated typed selectors.
- **Auth state:** Supabase `onAuthStateChange` via `AuthProvider` in `src/features/auth/context.tsx`. Access with `useAuth()`.

### Styling

SCSS with CSS Modules for component-scoped styles. Global variables in `src/styles/variables/`, responsive breakpoints in `src/styles/mixins/breakpoints.scss`.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`.

## Code Quality

- **ESLint** — `next/core-web-vitals` + `next/typescript` + `eslint-config-prettier`. `@typescript-eslint/no-explicit-any` is disabled.
- **Prettier** — Single quotes, trailing commas, 100 char width. Config in `.prettierrc`.
- **Stylelint** — `stylelint-config-standard-scss`. Config in `.stylelintrc.json`.
- **Vitest** — Unit tests with `@testing-library/react` and jsdom. Config in `vitest.config.mts`.
- **TypeScript** — `strict: true`. Run `pnpm typecheck` for standalone type checking.
