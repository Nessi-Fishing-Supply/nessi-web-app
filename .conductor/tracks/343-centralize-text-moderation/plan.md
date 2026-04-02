# Implementation Plan: #343 — Centralize text moderation and wire into all user-generated content routes

## Overview
4 phases, 15 total tasks
Estimated scope: large

## Phase 1: Foundation — Types, Blocklist, Core Text Filter, and Database Migration
**Goal:** Create the `src/libs/moderation/` module with the pure `scanText` function, extracted blocklist, shared types, and the `moderation_flags` database table.
**Verify:** `pnpm build`

### Task 1.1: Create moderation types
Define the shared types for the centralized moderation module. `TextScanAction` mirrors the existing `FilterAction` from messaging but is the canonical type going forward. `TextScanResult` mirrors `FilterResult`. `ModerationContext` identifies which surface triggered the scan (listing, member, shop, message). `ModerationViolation` represents a row in the `moderation_flags` table.
**Files:** `src/libs/moderation/types.ts`
**AC:** File exports `TextScanAction` (union: `'pass' | 'block' | 'redact' | 'nudge_off_platform' | 'nudge_negotiation'`), `TextScanResult` (with `action`, `filteredContent`, `originalContent`, `isFiltered`, `nudgeType?`), `ModerationContext` (union: `'listing' | 'member' | 'shop' | 'message'`), and `ModerationViolation` (with `id`, `member_id`, `context`, `action`, `original_content`, `created_at`). `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.2: Extract blocklist into moderation config
Move the `EXPLICIT_BLOCKLIST` array from `src/features/messaging/utils/safety-filter.ts` into a standalone config file. Also export the nudge message constants (`NUDGE_OFF_PLATFORM`, `NUDGE_NEGOTIATION`) from this config so they are available to both the moderation module and messaging.
**Files:** `src/libs/moderation/config/blocklist.ts`
**AC:** File exports `EXPLICIT_BLOCKLIST` (same 15-term array), `NUDGE_OFF_PLATFORM`, and `NUDGE_NEGOTIATION` (same string values as current messaging safety filter). No imports from `src/features/`. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.3: Create core scanText function
Port the filtering logic from `filterMessageContent` in `src/features/messaging/utils/safety-filter.ts` into `scanText(content: string, context: ModerationContext): TextScanResult`. The function must be pure — no Supabase imports, no side effects. It imports `EXPLICIT_BLOCKLIST` from `config/blocklist.ts`. The PII regex patterns (phone, email, address, credit card with Luhn), off-platform patterns, and negotiation patterns are defined in this file (same as current messaging implementation). The `context` parameter is stored on the result but does not change filtering behavior in this task.
**Files:** `src/libs/moderation/text-filter.ts`
**AC:** `scanText('test', 'listing')` returns `{ action: 'pass', ... }`. `scanText` with an explicit blocklist term returns `action: 'block'`. `scanText` with a phone number returns `action: 'redact'` with `[removed]`. Function signature is `(content: string, context: ModerationContext) => TextScanResult`. No imports from `src/features/`. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.4: Create barrel export and CLAUDE.md
Create the barrel export that re-exports types, `scanText`, and blocklist config. Write `CLAUDE.md` documenting the module architecture, the `scanText` contract, and the `moderation_flags` table schema.
**Files:** `src/libs/moderation/index.ts`, `src/libs/moderation/CLAUDE.md`
**AC:** `import { scanText, type TextScanResult, type ModerationContext, EXPLICIT_BLOCKLIST, NUDGE_OFF_PLATFORM, NUDGE_NEGOTIATION } from '@/libs/moderation'` resolves. CLAUDE.md documents the module purpose, function signatures, table schema, and key patterns. `pnpm build` passes.
**Expert Domains:** nextjs

### Task 1.5: Create moderation_flags database migration
Create a Supabase SQL migration that creates the `moderation_flags` table: `id` (uuid PK, default `gen_random_uuid()`), `member_id` (uuid, FK to `members(id) ON DELETE CASCADE`), `context` (text, NOT NULL — one of 'listing', 'member', 'shop', 'message'), `action` (text, NOT NULL — 'block' or 'redact'), `original_content` (text, NOT NULL), `filtered_content` (text, NULL), `source_id` (uuid, NULL — the listing/shop/thread ID if available), `created_at` (timestamptz, NOT NULL, default `now()`). Enable RLS. Add NO user-facing SELECT/INSERT/UPDATE/DELETE policies — the table is admin-only (accessed via admin client). Add an index on `member_id` for efficient lookups.
**Files:** `supabase/migrations/20260402000000_create_moderation_flags.sql`
**AC:** Migration SQL creates the table with all columns, FK constraint with CASCADE, RLS enabled, no user-facing policies, and an index on `member_id`. Migration file follows existing naming convention (`YYYYMMDDHHMMSS_description.sql`).
**MCP:** supabase
**Expert Domains:** supabase

### Task 1.6: Create moderation flag logging utility
Create a server-side utility function `logModerationFlag` that inserts a row into `moderation_flags` using the admin client. This is a fire-and-forget helper that catches and logs errors without throwing. Signature: `logModerationFlag(params: { memberId: string, context: ModerationContext, action: 'block' | 'redact', originalContent: string, filteredContent?: string | null, sourceId?: string | null }): Promise<void>`.
**Files:** `src/libs/moderation/log-flag.ts`
**AC:** Function imports `createAdminClient` from `@/libs/supabase/admin`. Inserts into `moderation_flags` table. Catches errors and logs to console without throwing. Export is added to `src/libs/moderation/index.ts` barrel. `pnpm typecheck` passes.
**Expert Domains:** supabase, nextjs

## Phase 2: Wire Moderation into Listing API Routes
**Goal:** Add text scanning to listing create and update endpoints so explicit terms are blocked and PII is redacted before persistence, with violations logged.
**Verify:** `pnpm build`

### Task 2.1: Wire scanText into POST /api/listings
In the existing `POST` handler in `src/app/api/listings/route.ts`, after the whitelist filtering of `filteredBody` and before the Supabase insert, scan the `title` and `description` fields using `scanText(text, 'listing')`. If either returns `block`, return 422 with an error message. If either returns `redact`, replace the field value in `filteredBody` with `filteredContent`. Log all `block` and `redact` results via `logModerationFlag` (fire-and-forget, with `sourceId` set to null since the listing doesn't exist yet). Nudge actions (`nudge_off_platform`, `nudge_negotiation`) are treated as `pass` for listings.
**Files:** `src/app/api/listings/route.ts`
**AC:** POST with an explicit blocklist term in `title` returns 422. POST with a phone number in `description` returns 201 with `[removed]` in the description. POST with clean text returns 201 unchanged. `logModerationFlag` is called for block/redact. `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 2.2: Wire scanText into PUT /api/listings/[id]
In the existing `PUT` handler in `src/app/api/listings/[id]/route.ts`, after the whitelist filtering and before the Supabase update, scan the `title` and `description` fields (only if present in the update payload) using `scanText(text, 'listing')`. Same logic as Task 2.1: `block` returns 422, `redact` replaces the value, nudges pass through. Log violations with `sourceId` set to the listing `id`.
**Files:** `src/app/api/listings/[id]/route.ts`
**AC:** PUT with an explicit term in `title` returns 422. PUT with an email in `description` returns 200 with `[removed]`. PUT without title/description fields passes through unaffected. `logModerationFlag` is called with the listing ID as `sourceId`. `pnpm build` passes.
**Expert Domains:** supabase, nextjs

## Phase 3: New API Routes for Member and Shop Profile Text Updates
**Goal:** Create thin API routes that intercept text updates for member profiles and shop profiles, run moderation, and persist. Update the client-side services to route through these new endpoints instead of direct Supabase calls.
**Verify:** `pnpm build`

### Task 3.1: Create POST /api/members/profile route
Create a new API route for member profile text updates. Accepts JSON body with optional fields: `bio`, `first_name`, `last_name` (and any other `MemberUpdateInput` fields for pass-through). Authenticates via server Supabase client. Scans `bio`, `first_name`, and `last_name` (if present) with `scanText(text, 'member')`. If any returns `block`, return 422. If any returns `redact`, replace the value. Nudges pass through. Persists via server Supabase client update to `members` table. Logs violations via `logModerationFlag` with `sourceId` as the user ID. Returns the updated member row. Add description comment per API conventions.
**Files:** `src/app/api/members/profile/route.ts`
**AC:** POST with explicit term in `bio` returns 422. POST with phone number in `bio` returns 200 with `[removed]`. POST with clean `first_name` and `bio` returns 200 with updated member. Route requires authentication (401 without). `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 3.2: Create PATCH /api/shops/[id]/profile route
Create a new API route for shop text updates. Uses `requireShopPermission(request, 'shop_settings', 'full', { expectedShopId })` for authorization. Accepts JSON body with optional fields: `shop_name`, `description` (and any other `ShopUpdate` fields for pass-through). Scans `shop_name` and `description` (if present) with `scanText(text, 'shop')`. If any returns `block`, return 422. If any returns `redact`, replace the value. Nudges pass through. Persists via admin client update to `shops` table. Logs violations via `logModerationFlag` with `sourceId` as the shop ID. Returns the updated shop row. Add description comment per API conventions.
**Files:** `src/app/api/shops/[id]/profile/route.ts`
**AC:** PATCH with explicit term in `shop_name` returns 422. PATCH with email in `description` returns 200 with `[removed]`. Route uses `requireShopPermission` for auth (401/403 without proper context). `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 3.3: Update updateMember service to route text fields through API
Modify `updateMember` in `src/features/members/services/member.ts` to detect when the update includes text-moderated fields (`bio`, `first_name`, `last_name`). When any of these fields are present, POST to `/api/members/profile` using the `post` helper from `@/libs/fetch` instead of the direct Supabase call. When only non-text fields are being updated (e.g., `onboarding_completed_at`, `home_state`, `primary_species`), continue using the direct Supabase client call as before. This preserves backward compatibility for all existing callers (`useUpdateMember`, `completeOnboarding`, onboarding steps).
**Files:** `src/features/members/services/member.ts`
**AC:** Updating `bio` routes through `/api/members/profile`. Updating `home_state` alone still uses direct Supabase. Updating both `bio` and `home_state` routes through the API (all fields sent together). `useUpdateMember` hook continues to work without changes. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 3.4: Update updateShop service to route text fields through API
Modify `updateShop` in `src/features/shops/services/shop.ts` to detect when the update includes text-moderated fields (`shop_name`, `description`). When any of these fields are present, PATCH to `/api/shops/{id}/profile` using the `patch` helper from `@/libs/fetch` instead of the direct Supabase call. When only non-text fields are being updated, continue using the direct Supabase client call. This preserves backward compatibility for `useUpdateShop`.
**Files:** `src/features/shops/services/shop.ts`
**AC:** Updating `description` routes through `/api/shops/{id}/profile`. Updating non-text fields (e.g., `avatar_url`) still uses direct Supabase. `useUpdateShop` hook continues to work without changes. `pnpm typecheck` passes.
**Expert Domains:** nextjs

## Phase 4: Migrate Messaging, Tests, and Backward Compatibility
**Goal:** Update messaging to use the centralized `scanText`, add comprehensive tests for the new module, and ensure full backward compatibility.
**Verify:** `pnpm build && pnpm test:run && pnpm lint && pnpm typecheck`

### Task 4.1: Update messaging route to use centralized scanText
Modify the `POST` handler in `src/app/api/messaging/threads/[thread_id]/messages/route.ts` to import `scanText` from `@/libs/moderation` instead of `filterMessageContent` from the local safety filter. Replace `filterMessageContent(content.trim())` with `scanText(content.trim(), 'message')`. Continue importing `NUDGE_OFF_PLATFORM` and `NUDGE_NEGOTIATION` from `@/libs/moderation` (instead of the local safety filter). Log `block` and `redact` violations via `logModerationFlag` with `context: 'message'` and `sourceId: thread_id`. The nudge insertion behavior remains unchanged.
**Files:** `src/app/api/messaging/threads/[thread_id]/messages/route.ts`
**AC:** Messaging behavior is identical — block returns 422, redact strips PII, nudges insert system messages. Imports come from `@/libs/moderation`. `logModerationFlag` is called for block/redact actions. `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 4.2: Convert safety-filter.ts to thin re-export wrapper
Replace the implementation in `src/features/messaging/utils/safety-filter.ts` with re-exports from `@/libs/moderation`. Export `filterMessageContent` as a wrapper around `scanText` that passes `'message'` as the context, preserving the same return type. Re-export `EXPLICIT_BLOCKLIST`, `NUDGE_OFF_PLATFORM`, `NUDGE_NEGOTIATION`, and the `FilterAction`/`FilterResult` types (as aliases for `TextScanAction`/`TextScanResult`). This ensures any existing imports from this path continue to work.
**Files:** `src/features/messaging/utils/safety-filter.ts`
**AC:** `import { filterMessageContent, EXPLICIT_BLOCKLIST, NUDGE_OFF_PLATFORM, NUDGE_NEGOTIATION } from '@/features/messaging/utils/safety-filter'` still resolves. `filterMessageContent('test')` returns the same shape as before. No logic duplication — all filtering delegates to `scanText`. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 4.3: Write tests for centralized text filter
Port all existing tests from `src/features/messaging/utils/__tests__/safety-filter.test.ts` to test `scanText` from `@/libs/moderation`. Add context-specific tests: verify `scanText('explicit', 'listing')` returns `block`, `scanText('555-123-4567', 'member')` returns `redact`, and `scanText('text me', 'shop')` returns `nudge_off_platform`. Test that the `context` field is correctly passed through in the result. Verify edge cases: empty string, whitespace-only, repeated calls with stateful regex.
**Files:** `src/libs/moderation/__tests__/text-filter.test.ts`
**AC:** All existing messaging safety filter test cases pass when run against `scanText`. New tests cover `listing`, `member`, `shop`, and `message` contexts. `pnpm test:run` passes with all tests green.
**Expert Domains:** nextjs
