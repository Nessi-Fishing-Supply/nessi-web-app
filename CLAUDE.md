# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nessi is an e-commerce web application built with Next.js 16 (App Router), Supabase Auth, Supabase PostgreSQL, and deployed on Vercel.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
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
- `src/context/auth.tsx` provides `useAuth()` hook wrapping Supabase session state

### Database

- Supabase PostgreSQL accessed via `@supabase/supabase-js` + `@supabase/ssr`
- Three client utilities in `src/libs/supabase/`: browser (`client.ts`), server (`server.ts`), admin (`admin.ts`)
- Row Level Security (RLS) policies enforce access control at the database level
- Types generated from Supabase schema via `pnpm db:types` into `src/types/database.ts`

### File Storage

Image uploads use Vercel Blob via `src/app/api/products/upload/route.ts`.

### Key Directories

- `src/app/api/` — API routes (auth, products, upload)
- `src/components/` — React components organized by type: cards, controls, forms, layout, navigation, indicators
- `src/services/` — Client-side API service functions (axios-based)
- `src/hooks/` — Custom hooks for form handling
- `src/validations/` — Yup validation schemas
- `src/types/` — TypeScript type definitions
- `src/styles/` — SCSS with variables, mixins, and utilities

### Styling

SCSS with CSS Modules for component-scoped styles. Global variables in `src/styles/variables/`, responsive breakpoints in `src/styles/mixins/breakpoints.scss`.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_APP_URL`.

## ESLint

Extends `next/core-web-vitals` and `next/typescript`. `@typescript-eslint/no-explicit-any` is disabled.
