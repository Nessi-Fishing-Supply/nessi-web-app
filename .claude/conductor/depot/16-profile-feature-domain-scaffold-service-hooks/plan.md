# Implementation Plan: #16 — Profile feature domain scaffold + service layer + hooks

## Overview
3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Types Foundation
**Goal:** Create the profiles feature directory structure and type definitions derived from the database schema.
**Verify:** `pnpm build`

### Task 1.1: Create profiles feature directory structure
Create the `src/features/profiles/` directory with subdirectories for types, services, and hooks. This establishes the feature scaffold that all subsequent tasks build on.
**Files:** `src/features/profiles/types/` (directory), `src/features/profiles/services/` (directory), `src/features/profiles/hooks/` (directory)
**AC:** Directories `src/features/profiles/types/`, `src/features/profiles/services/`, and `src/features/profiles/hooks/` exist.
**Expert Domains:** nextjs

### Task 1.2: Define Profile, ProfileUpdateInput, and OnboardingStatus types
Create the profile types file deriving `Profile` from `Database['public']['Tables']['profiles']['Row']` (following the pattern in `src/features/products/types/product.ts`). Define `ProfileUpdateInput` as `Omit<Database['public']['Tables']['profiles']['Update'], ...>` excluding system-managed fields: `id`, `created_at`, `updated_at`, `stripe_account_id`, `is_stripe_connected`, `stripe_onboarding_status`, `average_rating`, `review_count`, `total_transactions`, `last_seen_at`, `response_time_hours`. Define `OnboardingStatus` as `{ isComplete: boolean; completedAt: string | null }`.
**Files:** `src/features/profiles/types/profile.ts`
**AC:** File exports `Profile`, `ProfileUpdateInput`, and `OnboardingStatus` types. `Profile` equals `Database['public']['Tables']['profiles']['Row']`. `ProfileUpdateInput` omits all 11 system-managed fields from the database Update type. `pnpm typecheck` passes.
**Expert Domains:** supabase

## Phase 2: Service Layer
**Goal:** Implement all six Supabase service functions for profile CRUD and availability checks, plus update the onboarding service to query the profiles table.
**Verify:** `pnpm build`

### Task 2.1: Create profile service with getProfile and getProfileBySlug
Create the profile service file using the Supabase browser client (`createClient` from `src/libs/supabase/client.ts`). Implement `getProfile(userId: string)` which queries `profiles` by `id` and returns a single `Profile | null`. Implement `getProfileBySlug(slug: string)` which queries `profiles` by `slug` and returns a single `Profile | null`. Unlike the products service which uses axios via API routes, profile services call Supabase directly since RLS handles authorization.
**Files:** `src/features/profiles/services/profile.ts`
**AC:** `getProfile` queries `supabase.from('profiles').select('*').eq('id', userId).single()` and returns `Profile | null`. `getProfileBySlug` queries by `slug` column similarly. Both handle the case where no row is found by returning `null`. File imports `createClient` from `@/libs/supabase/client`.
**Expert Domains:** supabase

### Task 2.2: Add updateProfile service function
Add `updateProfile(userId: string, data: ProfileUpdateInput)` to the profile service. It should call `supabase.from('profiles').update(data).eq('id', userId).select().single()` and return the updated `Profile`. Throw an error if the update fails.
**Files:** `src/features/profiles/services/profile.ts`
**AC:** `updateProfile` is exported, accepts a `userId` string and `ProfileUpdateInput` data, performs an update query, and returns the updated `Profile`. Errors are thrown with a descriptive message.
**Expert Domains:** supabase

### Task 2.3: Add checkDisplayNameAvailable, checkSlugAvailable, and generateSlug service functions
Add three utility service functions: `checkDisplayNameAvailable(name: string)` queries profiles where `display_name` equals `name` (case-insensitive using `.ilike()`) and returns `boolean` (true if available). `checkSlugAvailable(slug: string)` queries profiles where `slug` equals the given slug and returns `boolean`. `generateSlug(displayName: string)` converts a display name to a URL-safe slug (lowercase, replace spaces/special chars with hyphens, strip leading/trailing hyphens, collapse consecutive hyphens).
**Files:** `src/features/profiles/services/profile.ts`
**AC:** All three functions are exported. `checkDisplayNameAvailable` returns `true` when no matching row exists (case-insensitive). `checkSlugAvailable` returns `true` when no matching row exists. `generateSlug` produces a valid URL slug from a display name string (e.g., "John Doe" becomes "john-doe"). `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 2.4: Update onboarding service to query profiles table
Replace the stub in `src/features/auth/services/onboarding.ts` with a real implementation. `checkOnboardingComplete()` should get the current user via `supabase.auth.getUser()`, then query `profiles` for that user's `onboarding_completed_at` field. Return `{ isComplete: true }` if the field is non-null, `{ isComplete: false }` otherwise. If there is no authenticated user or no profile row, return `{ isComplete: false }`. Keep the same function signature `(): Promise<{ isComplete: boolean }>` so existing callers in `LoginForm` are unaffected. Update the existing test file to mock Supabase and test both complete and incomplete scenarios.
**Files:** `src/features/auth/services/onboarding.ts`, `src/features/auth/services/__tests__/onboarding.test.ts`
**AC:** `checkOnboardingComplete` uses `createClient` from `@/libs/supabase/client` to get the current user and query the profiles table. Returns `{ isComplete: true }` when `onboarding_completed_at` is non-null, `{ isComplete: false }` otherwise. The function signature remains `(): Promise<{ isComplete: boolean }>`. Tests cover: authenticated user with completed onboarding, authenticated user without completed onboarding, no authenticated user, no profile row found. `pnpm test:run` passes for the onboarding test file.
**Expert Domains:** supabase

## Phase 3: Tanstack Query Hooks + Documentation
**Goal:** Create all four Tanstack Query hooks for profile data fetching and mutations, and add the feature CLAUDE.md documentation.
**Verify:** `pnpm build`

### Task 3.1: Create useProfile and useProfileBySlug query hooks
Create the hooks file following the pattern in `src/features/products/hooks/use-products.ts`. Implement `useProfile(userId: string)` using `useQuery` with queryKey `['profiles', userId]` and queryFn calling `getProfile(userId)`. The hook should accept an optional `enabled` parameter (default `true`) so callers can defer the query. Implement `useProfileBySlug(slug: string)` with queryKey `['profiles', 'slug', slug]` calling `getProfileBySlug(slug)`, also with optional `enabled` parameter.
**Files:** `src/features/profiles/hooks/use-profile.ts`
**AC:** Both hooks are exported. `useProfile` uses queryKey `['profiles', userId]` and calls `getProfile`. `useProfileBySlug` uses queryKey `['profiles', 'slug', slug]`. Both accept an optional `enabled` parameter. Both import from `@tanstack/react-query` and from the profile service.
**Expert Domains:** state-management

### Task 3.2: Add useUpdateProfile mutation hook and useDisplayNameCheck hook
Add `useUpdateProfile()` using `useMutation` that calls `updateProfile`. On success, invalidate queries matching `['profiles']` using `queryClient.invalidateQueries()` (get `queryClient` via `useQueryClient()`). Add `useDisplayNameCheck(name: string)` using `useQuery` with queryKey `['profiles', 'display-name-check', name]` calling `checkDisplayNameAvailable(name)`. It should be disabled when `name` is empty or shorter than 2 characters, and should use a `staleTime` of 30 seconds to avoid excessive checks.
**Files:** `src/features/profiles/hooks/use-profile.ts`
**AC:** `useUpdateProfile` is exported, uses `useMutation` with `mutationFn` calling `updateProfile`, and `onSuccess` invalidates `['profiles']` queries. `useDisplayNameCheck` is exported, uses `useQuery` with `enabled: name.length >= 2`, `staleTime: 30000`. `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 3.3: Create profiles feature CLAUDE.md
Write the feature documentation following the pattern in `src/features/products/CLAUDE.md`. Document: overview (profile management for C2C marketplace users), architecture (types, services, hooks file descriptions), key patterns (direct Supabase queries via browser client with RLS, no API routes; types derived from database schema; slug generation for profile URLs; onboarding integration via auth service), and list all exported functions and hooks.
**Files:** `src/features/profiles/CLAUDE.md`
**AC:** File exists and documents: overview, architecture listing all files with descriptions, key patterns (direct Supabase access, RLS-based auth, database-derived types), and lists all exported types, service functions, and hooks.
**Expert Domains:** nextjs
