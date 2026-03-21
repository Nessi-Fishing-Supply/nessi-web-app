# Implementation Plan: #69 — feat(shops): create shops feature domain

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Types and Feature Scaffolding
**Goal:** Create the shops and context feature directories with types derived from the database schema and CLAUDE.md documentation
**Verify:** `pnpm build`

### Task 1.1: Create shops feature types
Define `Shop`, `ShopInsert`, `ShopUpdate`, `ShopMember`, `ShopMemberInsert`, and `ShopMemberRole` types derived from `Database['public']['Tables']['shops']` and `Database['public']['Tables']['shop_members']`. Follow the exact pattern from `src/features/products/types/product.ts` and `src/features/members/types/member.ts` — import `Database` from `@/types/database` and alias Row/Insert/Update. `ShopMemberRole` should be a string union type (`'owner' | 'manager' | 'staff'`). Also create a `ShopInsert` that omits system-managed fields (id, created_at, updated_at, deleted_at, stripe fields, rating/review/transaction stats, is_verified) from the database Insert type, and `ShopUpdate` that omits those same fields from the database Update type.
**Files:** `src/features/shops/types/shop.ts`
**AC:** Types compile without errors; `Shop` is `Database['public']['Tables']['shops']['Row']`; `ShopMember` is `Database['public']['Tables']['shop_members']['Row']`; `ShopInsert` and `ShopUpdate` omit system-managed fields
**Expert Domains:** supabase

### Task 1.2: Create shops feature CLAUDE.md
Document the shops feature architecture following the pattern in `src/features/members/CLAUDE.md`. Include overview (shops are business entities, separate from member identity), architecture section listing types/services/hooks files with their purposes, service function table, hooks table with query keys, key patterns section (direct Supabase access with RLS, database-derived types, system-managed fields, slug uniqueness via shared slugs table). Reference the design spec at `docs/superpowers/specs/2026-03-20-shops-architecture-design.md`.
**Files:** `src/features/shops/CLAUDE.md`
**AC:** CLAUDE.md exists and documents all planned types, services, hooks, and key patterns; follows the structure of `src/features/members/CLAUDE.md`

### Task 1.3: Create context feature directory with store types and CLAUDE.md
Create `src/features/context/` with a `CLAUDE.md` documenting the context switching architecture. The CLAUDE.md should explain that the context store manages which entity (member or shop) the user is currently acting as, using Zustand with localStorage persistence. Document the `ActiveContext` type (`{ type: 'member' } | { type: 'shop'; shopId: string }`), the store shape, and the actions (`switchToMember`, `switchToShop`, `reset`). Note that the default context is `{ type: 'member' }` when no persisted value exists.
**Files:** `src/features/context/CLAUDE.md`
**AC:** CLAUDE.md exists and documents the context store architecture, ActiveContext type, actions, and persistence behavior

## Phase 2: Services and Context Store
**Goal:** Implement all Supabase service functions for shops and the Zustand context store with localStorage persistence
**Verify:** `pnpm build`

### Task 2.1: Create shops service functions
Implement all 12 service functions using `createClient()` from `@/libs/supabase/client` (browser client with RLS). Follow the pattern from `src/features/members/services/member.ts` — each function creates a client, runs a Supabase query, handles errors with descriptive messages, and returns typed results. Handle `PGRST116` (no rows) by returning `null` for single-row queries. Functions: `getShop(id)`, `getShopBySlug(slug)` (exclude soft-deleted via `.is('deleted_at', null)`), `getShopsByOwner(memberId)`, `getShopsByMember(memberId)` (join through shop_members), `createShop(data)`, `updateShop(id, data)`, `deleteShop(id)` (soft delete by setting deleted_at), `getShopMembers(shopId)`, `addShopMember(shopId, memberId, role)`, `removeShopMember(shopId, memberId)`, `transferOwnership(shopId, newOwnerId)`, `checkShopSlugAvailable(slug)`.
**Files:** `src/features/shops/services/shop.ts`
**AC:** All 12 functions compile; use `createClient()` from `@/libs/supabase/client`; error handling follows members service pattern; `getShopBySlug` excludes soft-deleted shops; `deleteShop` does soft delete; `checkShopSlugAvailable` checks the `slugs` table (not just shops)
**Expert Domains:** supabase

### Task 2.2: Create context Zustand store with localStorage persistence
Create the context store using Zustand with `persist` middleware from `zustand/middleware` and `createSelectors` from `@/libs/create-selectors`. Follow the onboarding store pattern in `src/features/members/stores/onboarding-store.ts` but add persist middleware. Define `ActiveContext` type as a discriminated union: `{ type: 'member' } | { type: 'shop'; shopId: string }`. Store state: `activeContext: ActiveContext` defaulting to `{ type: 'member' }`. Actions: `switchToMember()` sets context to `{ type: 'member' }`, `switchToShop(shopId: string)` sets context to `{ type: 'shop', shopId }`, `reset()` sets context back to default. Use `persist` with key `'nessi-context'` and localStorage. Export the store wrapped with `createSelectors`.
**Files:** `src/features/context/stores/context-store.ts`
**AC:** Store compiles; defaults to `{ type: 'member' }`; `switchToShop('abc')` sets `{ type: 'shop', shopId: 'abc' }`; `switchToMember()` resets to member context; `reset()` resets to default; uses `persist` middleware with `'nessi-context'` key; wrapped with `createSelectors`; selectors accessible via `useContextStore.use.activeContext()`
**Expert Domains:** state-management

## Phase 3: Tanstack Query Hooks
**Goal:** Create all Tanstack Query hooks for shops data fetching and mutations, completing the data layer
**Verify:** `pnpm build`

### Task 3.1: Create shops query hooks
Implement query hooks using `useQuery` from `@tanstack/react-query`. Follow the pattern from `src/features/members/hooks/use-member.ts`. Hooks: `useShop(id, enabled?)` with key `['shops', id]`, `useShopBySlug(slug, enabled?)` with key `['shops', 'slug', slug]`, `useShopsByOwner(memberId, enabled?)` with key `['shops', 'owner', memberId]`, `useShopsByMember(memberId, enabled?)` with key `['shops', 'member', memberId]`, `useShopMembers(shopId, enabled?)` with key `['shops', shopId, 'members']`, `useShopSlugCheck(slug)` with key `['shops', 'slug-check', slug]` enabled when slug length >= 2 with 30s staleTime (matching `useDisplayNameCheck` pattern).
**Files:** `src/features/shops/hooks/use-shops.ts`
**AC:** All 6 query hooks compile; query keys follow `['shops', ...]` pattern; `useShopSlugCheck` only fires when slug >= 2 chars; all hooks accept optional `enabled` parameter where applicable
**Expert Domains:** state-management

### Task 3.2: Create shops mutation hooks
Implement mutation hooks using `useMutation` from `@tanstack/react-query`. Follow the pattern from `src/features/members/hooks/use-member.ts` — each mutation gets `useQueryClient()` and invalidates relevant queries on success. Hooks: `useCreateShop()` invalidates `['shops']`, `useUpdateShop()` invalidates `['shops']`, `useDeleteShop()` invalidates `['shops']`, `useAddShopMember()` invalidates `['shops', shopId, 'members']` (extract shopId from mutation variables), `useRemoveShopMember()` invalidates `['shops', shopId, 'members']`, `useTransferOwnership()` invalidates `['shops']`.
**Files:** `src/features/shops/hooks/use-shops.ts` (append to existing file from Task 3.1)
**AC:** All 6 mutation hooks compile; each invalidates appropriate query keys on success; mutation function signatures match corresponding service functions
**Expert Domains:** state-management
