# Implementation Plan: #70 — Update member services and account page for display_name and is_seller

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Service and hook updates
**Goal:** Update `checkSlugAvailable` to query the `slugs` table via RPC and add a `useSlugCheck` hook
**Verify:** `pnpm build`

### Task 1.1: Update checkSlugAvailable to use the slugs table RPC function
The `checkSlugAvailable()` function in `src/features/members/services/member.ts` currently queries `from('members').select('id').eq('slug', slug)`. The database already has a `check_slug_available` RPC function (typed in `database.ts` as `check_slug_available: { Args: { p_slug: string }; Returns: boolean }`). Replace the current implementation to call `supabase.rpc('check_slug_available', { p_slug: slug })` and return the boolean result directly. This ensures slug uniqueness is checked against the centralized `slugs` table which covers both members and shops.
**Files:** `src/features/members/services/member.ts`
**AC:** `checkSlugAvailable()` calls `supabase.rpc('check_slug_available', { p_slug: slug })` instead of querying `from('members')`. Returns `true` when the slug is available, `false` when taken.
**Expert Domains:** supabase

### Task 1.2: Add useSlugCheck hook
Add a `useSlugCheck(slug: string)` hook to `src/features/members/hooks/use-member.ts` that wraps `checkSlugAvailable` in a Tanstack Query `useQuery`. Follow the same pattern as `useDisplayNameCheck`: enable only when `slug.length >= 2`, use a 30-second `staleTime`, and use query key `['slugs', 'check', slug]`. Also add the `checkSlugAvailable` import to the existing imports in the file.
**Files:** `src/features/members/hooks/use-member.ts`
**AC:** `useSlugCheck(slug)` is exported, returns `useQuery` result, is disabled when slug is less than 2 characters, and uses the `['slugs', 'check', slug]` query key.
**Expert Domains:** state-management

## Phase 2: Seller settings component and account page integration
**Goal:** Create the SellerSettings component with is_seller toggle and integrate it into the account page between Notifications and Linked Accounts
**Verify:** `pnpm build`

### Task 2.1: Create seller-settings SCSS module
Create `src/features/members/components/account/seller-settings/seller-settings.module.scss` with styles for the toggle row. Follow the exact toggle pattern from `notifications/notifications.module.scss` — reuse the same `.toggle` checkbox-as-switch styles (appearance: none, pill track with thumb pseudo-element, checked state using `--color-primary`, focus-visible outline, disabled opacity). Add a `.warning` class for the inline warning text shown on toggle-off (font-size `var(--font-size-xs)`, color `var(--color-warning-600)` or `var(--color-gray-600)`, margin-top `var(--space-2xs)`). Add a `.guardText` class for placeholder precondition text with `aria-disabled` styling (opacity 0.5, font-size `var(--font-size-xs)`). Use mobile-first approach with `@use '@/styles/mixins/breakpoints' as *`.
**Files:** `src/features/members/components/account/seller-settings/seller-settings.module.scss`
**AC:** SCSS module compiles, contains `.toggle` switch styles matching the notifications pattern, `.warning` class for toggle-off message, and `.guardText` for placeholder precondition text.
**Expert Domains:** scss

### Task 2.2: Create SellerSettings component
Create `src/features/members/components/account/seller-settings/index.tsx`. This is a `'use client'` component that accepts `{ member: Member; userId: string }` props — same interface as `Notifications`. It renders a `CollapsibleCard` (from `@/components/layout/collapsible-card`) with title "Seller Settings". Inside, render a single toggle row with:
- Label: "Enable selling on your profile"
- Description: "Allow buyers to discover your listings and shop"
- A checkbox input with `role="switch"`, `aria-checked={member.is_seller}`, checked state bound to `member.is_seller`
- On toggle-on: call `useUpdateMember` with `{ is_seller: true }`, show success toast "Seller mode enabled"
- On toggle-off: first show an inline warning paragraph "Turning off seller mode will hide your listings from public view. You can turn it back on anytime." below the toggle, then save `{ is_seller: false }` via `useUpdateMember`, show success toast "Seller mode disabled"
- Below the toggle, render placeholder precondition guard text: "Active orders and published listings will need to be resolved before disabling seller mode." with `aria-disabled="true"` styling. This is informational only — no actual checks.
- Disable the toggle while `updateMember.isPending`
- Handle errors with an error toast matching the pattern in `Notifications`

Follow the exact toggle HTML pattern from `notifications/index.tsx` (checkbox input with `role="switch"`, `aria-checked`, `onChange`).
**Files:** `src/features/members/components/account/seller-settings/index.tsx`
**Reuses:** `src/components/layout/collapsible-card`, `src/components/indicators/toast/context`, `src/features/members/hooks/use-member.ts` (useUpdateMember)
**AC:** Component renders a CollapsibleCard with "Seller Settings" title. Toggle has `role="switch"` and `aria-checked`. Toggling on calls `useUpdateMember` with `{ is_seller: true }`. Toggling off shows inline warning text and calls `useUpdateMember` with `{ is_seller: false }`. Placeholder guard text is visible with `aria-disabled` state. Error state shows toast.
**Expert Domains:** nextjs, scss

### Task 2.3: Integrate SellerSettings into the account page
Import and render `SellerSettings` in `src/app/(frontend)/dashboard/account/page.tsx`. Place it between the `Notifications` and `LinkedAccounts` components (after line 85, before line 86 in current file). Pass `member={member as Member}` and `userId={userId}` props, wrapped in the same `{member && ...}` guard as the other sections. Add the import at the top of the file alongside the other account component imports.
**Files:** `src/app/(frontend)/dashboard/account/page.tsx`
**AC:** Account page renders SellerSettings section between Notifications and Linked Accounts. The component receives `member` and `userId` props. Page builds without errors.
**Expert Domains:** nextjs

### Task 2.4: Verify personal-info labels are correct
The ticket requires ensuring the personal-info label says "Display name" (not "Shop name"). After scanning the codebase, the label at line 169 of `personal-info/index.tsx` already reads "Display name" and the toast at line 95 already says "Your display name has been updated." Verify no lingering "shop name" or "Shop name" strings exist anywhere in the members feature. If any are found, update them to "display name" / "Display name". If none are found, this task is a no-op verification.
**Files:** `src/features/members/components/account/personal-info/index.tsx` (verify only, likely no changes needed)
**AC:** No string "shop name" or "Shop name" appears in any file under `src/features/members/`. The label reads "Display name" and toast says "display name".
**Expert Domains:** nextjs

## Phase 3: Documentation update
**Goal:** Update the members feature CLAUDE.md to document the new seller-settings component and updated slug check behavior
**Verify:** `pnpm build`

### Task 3.1: Update members CLAUDE.md with seller-settings documentation
Update `src/features/members/CLAUDE.md` to:
1. In the "Service Functions" table, update the `checkSlugAvailable(slug)` description to note it now uses the `check_slug_available` RPC function against the `slugs` table (not direct member query)
2. In the "Hooks" table, add a row for `useSlugCheck(slug, enabled?)` with query key `['slugs', 'check', slug]` and purpose "Slug availability check via slugs table RPC (enabled when slug >= 2 chars, 30s stale time)"
3. In the "Account Components" table, add a row for `seller-settings/` with purpose "is_seller toggle switch with inline warning on disable, placeholder precondition guards, saves via useUpdateMember"
**Files:** `src/features/members/CLAUDE.md`
**AC:** CLAUDE.md documents the updated `checkSlugAvailable` behavior, the new `useSlugCheck` hook, and the new `seller-settings/` account component.
