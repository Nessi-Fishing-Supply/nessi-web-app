# Implementation Plan: #212 — feature scaffold, services, API routes, and hooks

## Overview

4 phases, 14 total tasks
Estimated scope: medium

## Phase 1: Types and Server Services

**Goal:** Define all follow-related types derived from the database schema and implement server-side Supabase query functions.
**Verify:** `pnpm build`

### Task 1.1: Create follow types

Define database-derived types for the follows feature, following the pattern in `src/features/flags/types/flag.ts`. Types include `Follow` (Row), `FollowInsert` (Insert with `id` and `created_at` omitted), `FollowTargetType` as a union literal `'member' | 'shop'` (not from an enum since the DB schema uses a TEXT column with CHECK constraint, not a Postgres enum), `FollowStatus` response shape `{ is_following: boolean }`, `FollowerCount` response shape `{ count: number }`, and `FollowingItem` for joined data `{ id, target_type, target_id, created_at, name, avatar_url }`.
**Files:** `src/features/follows/types/follow.ts`
**AC:** All six types are exported. `Follow` and `FollowInsert` derive from `Database['public']['Tables']['follows']`. `FollowTargetType` is `'member' | 'shop'`. File compiles with no errors.
**Expert Domains:** supabase

### Task 1.2: Create follow server services

Implement server-side Supabase query functions in a server service file, following the pattern in `src/features/flags/services/flag-server.ts`. All functions use `createClient` from `@/libs/supabase/server`. Functions: (1) `createFollowServer(followerId, targetType, targetId)` — INSERT into `follows`, catch error code `23505` for duplicate (throw "Already following"), validate self-follow by checking `targetType === 'member' && followerId === targetId` (throw "Cannot follow yourself"). (2) `deleteFollowServer(followerId, targetType, targetId)` — DELETE with `.eq()` filters, check row count to determine if anything was deleted, return `{ success: boolean }`. (3) `getFollowStatusServer(followerId, targetType, targetId)` — SELECT with `.maybeSingle()`, return `{ is_following: boolean }`. (4) `getFollowerCountServer(targetType, targetId)` — SELECT `follower_count` from the appropriate table (`members` or `shops`) based on `targetType`, return `{ count: number }`. (5) `getFollowingServer(followerId, targetType?)` — SELECT from `follows` filtered by `follower_id` and optionally `target_type`, then for each result query the target table to get `name` (first_name + last_name for members, name for shops) and `avatar_url`, return `FollowingItem[]`.
**Files:** `src/features/follows/services/follow-server.ts`
**AC:** All five functions are exported and use the Supabase server client. `createFollowServer` catches 23505 and rejects self-follows. `deleteFollowServer` returns success/failure. `getFollowerCountServer` reads from members or shops table based on target_type. `getFollowingServer` returns joined data with name and avatar_url. File compiles with no errors.
**Expert Domains:** supabase

## Phase 2: API Routes

**Goal:** Create five API route handlers that expose follow operations to the client, matching the patterns in `src/app/api/flags/route.ts` and `src/app/api/flags/check/route.ts`.
**Verify:** `pnpm build`

### Task 2.1: Create POST /api/follows route (follow)

Create the main follows route file with a POST handler. Authenticate via Supabase server client `getUser()`. Parse JSON body for `target_type` and `target_id`. Validate `target_type` is `'member'` or `'shop'` and `target_id` is present. Call `createFollowServer`. Return 201 on success, 400 on validation error or self-follow, 401 on unauthenticated, 409 on duplicate. Use `AUTH_CACHE_HEADERS` from `@/libs/api-headers`. Add description comment above handler per API CLAUDE.md conventions.
**Files:** `src/app/api/follows/route.ts`
**AC:** POST returns 201 with follow record on success, 400 if self-follow or missing params, 401 if unauthenticated, 409 if already following. Uses `AUTH_CACHE_HEADERS`. Has description comment above handler.
**Expert Domains:** nextjs, supabase

### Task 2.2: Create DELETE /api/follows route (unfollow)

Add a DELETE handler to the same route file. Authenticate via Supabase server client. Parse JSON body for `target_type` and `target_id`. Call `deleteFollowServer`. Return 200 on success, 401 on unauthenticated, 404 if not currently following. Use `AUTH_CACHE_HEADERS`. Add description comment.
**Files:** `src/app/api/follows/route.ts`
**AC:** DELETE returns 200 on success, 401 if unauthenticated, 404 if follow relationship not found. Has description comment above handler.
**Expert Domains:** nextjs, supabase

### Task 2.3: Create GET /api/follows/status route

Create a status sub-route. Authenticate via Supabase server client. Read `target_type` and `target_id` from URL search params. Validate both are present and `target_type` is valid. Call `getFollowStatusServer`. Return 200 with `{ is_following: boolean }`. Use `AUTH_CACHE_HEADERS`. Add description comment.
**Files:** `src/app/api/follows/status/route.ts`
**AC:** GET returns 200 with `{ is_following }`. Returns 400 if params missing or invalid. Returns 401 if unauthenticated. Has description comment.
**Expert Domains:** nextjs, supabase

### Task 2.4: Create GET /api/follows/count route

Create a count sub-route. This endpoint does NOT require authentication (follower counts are public). Read `target_type` and `target_id` from URL search params. Validate both are present and `target_type` is valid. Call `getFollowerCountServer`. Return 200 with `{ count: number }`. No auth cache headers needed since this is public data — use standard no-cache headers or none.
**Files:** `src/app/api/follows/count/route.ts`
**AC:** GET returns 200 with `{ count }`. Returns 400 if params missing or invalid. No authentication required. Has description comment.
**Expert Domains:** nextjs, supabase

### Task 2.5: Create GET /api/follows/following route

Create a following sub-route. Authenticate via Supabase server client. Read optional `target_type` from URL search params. If provided, validate it is `'member'` or `'shop'`. Call `getFollowingServer` with the authenticated user's ID and optional target_type filter. Return 200 with `FollowingItem[]`. Use `AUTH_CACHE_HEADERS`.
**Files:** `src/app/api/follows/following/route.ts`
**AC:** GET returns 200 with array of following items including name and avatar_url. Optional target_type filter works. Returns 401 if unauthenticated. Has description comment.
**Expert Domains:** nextjs, supabase

## Phase 3: Client Services, Hooks, and Barrel Export

**Goal:** Create client-side fetch wrappers and Tanstack Query hooks including an optimistic follow toggle mutation, then export the public API.
**Verify:** `pnpm build`

### Task 3.1: Create follow client services

Implement thin client-side fetch wrappers using `get`, `post`, and `del` from `@/libs/fetch`, following the pattern in `src/features/flags/services/flag.ts`. Functions: (1) `followTarget(targetType, targetId)` — POST to `/api/follows` with body `{ target_type, target_id }`. (2) `unfollowTarget(targetType, targetId)` — DELETE to `/api/follows` with body (note: the `del` helper in `@/libs/fetch` does not accept a body — use `request` directly or switch to POST-style with method override; check the `del` signature and if it only takes a URL, use a custom call with `fetch` or adjust approach to pass params as query string). Actually, looking at the `del` export, it only takes a URL. So `unfollowTarget` should encode params as query string: `del('/api/follows?target_type=X&target_id=Y')`. Update the DELETE API route (Task 2.2) to read from searchParams instead of body. (3) `getFollowStatus(targetType, targetId)` — GET `/api/follows/status?target_type=X&target_id=Y`. (4) `getFollowerCount(targetType, targetId)` — GET `/api/follows/count?target_type=X&target_id=Y`. (5) `getFollowing(targetType?)` — GET `/api/follows/following` with optional `?target_type=X`.
**Files:** `src/features/follows/services/follow.ts`
**AC:** All five functions are exported. They use `get`, `post`, `del` from `@/libs/fetch`. Return types match the server response shapes. File compiles with no errors.
**Expert Domains:** nextjs

### Task 3.2: Create useFollowStatus hook

Implement a Tanstack Query hook following the pattern in `src/features/flags/hooks/use-flags.ts`. Query key: `['follows', 'status', targetType, targetId]`. Calls `getFollowStatus` client service. `enabled` guard: both `targetType` and `targetId` must be truthy. Returns `{ is_following: boolean }`.
**Files:** `src/features/follows/hooks/use-follow-status.ts`
**AC:** Hook returns query result with `is_following`. Query is disabled when params are missing. Query key follows the specified pattern.
**Expert Domains:** state-management

### Task 3.3: Create useFollowerCount hook

Implement a Tanstack Query hook. Query key: `['follows', 'count', targetType, targetId]`. Calls `getFollowerCount` client service. `enabled` guard: both params truthy. Returns `{ count: number }`.
**Files:** `src/features/follows/hooks/use-follower-count.ts`
**AC:** Hook returns query result with `count`. Query is disabled when params are missing.
**Expert Domains:** state-management

### Task 3.4: Create useFollowing hook

Implement a Tanstack Query hook. Query key: `['follows', 'following', targetType]` (targetType may be undefined). Calls `getFollowing` client service. Always enabled (user is authenticated if they can reach the page). Returns `FollowingItem[]`.
**Files:** `src/features/follows/hooks/use-following.ts`
**AC:** Hook returns query result with array of FollowingItem. Optional targetType filter is passed through.
**Expert Domains:** state-management

### Task 3.5: Create useFollowToggle hook

Implement an optimistic mutation hook following the patterns in `src/features/listings/hooks/use-listings.ts`. Accepts `{ targetType, targetId, onSuccess?, onError? }`. The mutation function checks current follow status and calls either `followTarget` or `unfollowTarget`. Optimistic update in `onMutate`: (1) cancel queries for status and count keys, (2) snapshot previous status and count, (3) optimistically set status to toggled value, (4) optimistically increment/decrement count. `onError` rolls back to snapshots. `onSettled` invalidates status, count, and following queries. Handle 409 (already following) gracefully — treat as success (already in desired state). Handle 404 (not following) on unfollow gracefully.
**Files:** `src/features/follows/hooks/use-follow-toggle.ts`
**AC:** Hook provides a `mutate`/`mutateAsync` that toggles follow state. Optimistically updates both status and count queries. Rolls back on error. Invalidates `['follows', 'status']`, `['follows', 'count']`, and `['follows', 'following']` on settle. Handles 409 and 404 edge cases.
**Expert Domains:** state-management

### Task 3.6: Create barrel export

Create the feature barrel export following the pattern in `src/features/flags/index.ts`. Export all types, all hooks. Do not export server services (they are internal). Do not export client services directly (consumers use hooks).
**Files:** `src/features/follows/index.ts`
**AC:** Barrel exports all public types (`Follow`, `FollowInsert`, `FollowTargetType`, `FollowStatus`, `FollowerCount`, `FollowingItem`) and all hooks (`useFollowStatus`, `useFollowerCount`, `useFollowToggle`, `useFollowing`). File compiles with no errors.

## Phase 4: Documentation Update

**Goal:** Update the existing follows CLAUDE.md to document the full feature architecture including types, services, hooks, API routes, and public API.
**Verify:** `pnpm build`

### Task 4.1: Update follows CLAUDE.md

Update `src/features/follows/CLAUDE.md` to document the complete feature, following the structure and level of detail in `src/features/flags/CLAUDE.md`. Add sections for: Architecture (listing each file with its types/functions), API Routes table (method, route, handler, status codes, description), Public API (barrel exports with usage examples), Key Patterns (server client usage, optimistic updates, polymorphic target, 409/404 handling), and update the Directory Structure to reflect all created files. Preserve the existing Database Schema, Polymorphic Target Pattern, Denormalized follower_count, and RLS Policies sections. Add a note about the DELETE route using query params (not body) due to the `del` fetch wrapper limitation.
**Files:** `src/features/follows/CLAUDE.md`
**AC:** CLAUDE.md documents all types, server services, client services, hooks, and API routes. Architecture section lists every file with its exports. API Routes table covers all five endpoints with status codes. Public API section shows barrel import examples. Directory structure is accurate.
