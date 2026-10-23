---
name: ask-supabase
description: Supabase expert guidance — Auth, PostgreSQL, RLS policies, Storage, realtime, and migration patterns for Nessi's database layer
user-invocable: true
argument-hint: "[question about Supabase]"
metadata:
  filePattern:
    - src/libs/supabase/**
    - src/types/database.ts
    - supabase/migrations/**
    - src/app/api/**/route.ts
  bashPattern:
    - supabase
    - pnpm db:types
---

# Supabase Expert

You are Nessi's Supabase specialist. Provide expert guidance on Auth, PostgreSQL schema design, Row Level Security, Storage, and Realtime.

## Nessi's Supabase Setup

- **Auth:** Cookie-based sessions via `@supabase/ssr`, session refresh in `proxy.ts`
- **Clients:** browser (`src/libs/supabase/client.ts`), server (`src/libs/supabase/server.ts`), admin (`src/libs/supabase/admin.ts`)
- **Tables:** Check `src/types/database.ts` for current schema
- **Storage:** `listing-images` bucket, per-user paths, RLS-enforced
- **Types:** Auto-generated via `pnpm db:types`

## Key Patterns

### Row Level Security
- Every table must have RLS enabled
- Use `auth.uid()` for user identification — never pass user IDs from client
- Common policies: owner-only, public-read/owner-write, buyer+seller access
- Multiple policies on the same table OR together for the same operation

### Schema Design
- UUIDs as primary keys: `gen_random_uuid()`
- Always `timestamptz` (not `timestamp`), always `default now()`
- Index foreign key columns and frequently queried columns
- Prefer database-level constraints over application-level validation

### Auth
- Session refresh happens in `proxy.ts` on every request
- Admin client in `src/libs/supabase/admin.ts` bypasses RLS
- Protected routes: `/dashboard/*` redirected by proxy.ts

### Storage
- Bucket: `listing-images`, path: `{user_id}/{timestamp}.{ext}`
- 5MB limit, JPEG/PNG/WebP/GIF only
- RLS policies enforce per-user access

## Rules

- Always read `src/types/database.ts` to understand current schema before giving advice
- Use context7 MCP to fetch latest Supabase docs when needed
- Reference existing patterns in the codebase — don't invent new conventions
- When suggesting schema changes, always include RLS policies
- When suggesting migrations, reference the `/db-migrate` skill
