# Implementation Plan: #213 — FollowButton component with optimistic toggle

## Overview

3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Component types and props interface

**Goal:** Define the FollowButton props type and export it from the follows barrel, establishing the contract before building UI
**Verify:** `pnpm build`

### Task 1.1: Define FollowButtonProps type and add component types file

Create a dedicated types file for follow UI component props. The `FollowButtonProps` interface must include `targetType` (FollowTargetType), `targetId` (string), `targetName` (string for aria-label), `initialFollowerCount` (optional number for SSR hydration before the query resolves), `size` (optional 'sm' | 'md' for future flexibility), and `className` (optional string). Export the type from the follows barrel.
**Files:** `src/features/follows/types/follow-button.ts`, `src/features/follows/index.ts`
**AC:** `FollowButtonProps` is importable from `@/features/follows`. `pnpm typecheck` passes. The type includes all five props specified in the ticket: `targetType`, `targetId`, `targetName`, `initialFollowerCount`, and `className`.

## Phase 2: FollowButton component and styles

**Goal:** Build the FollowButton component with three visual states, optimistic count, auth gate, toast feedback, and full ARIA support
**Verify:** `pnpm build && pnpm lint && pnpm lint:styles`

### Task 2.1: Create FollowButton SCSS module with three visual states

Create the SCSS module for FollowButton with mobile-first styles. Three visual states: (1) "Follow" default state — outline style with primary border/text, transparent background; (2) "Following" active state — filled primary background with white text; (3) "Unfollow" hover-on-following state — filled destructive background with white text. The button must have a minimum 44x44px tap target (WCAG 2.5.8). Include a wrapper class for the button + count layout (inline-flex, centered gap). The count text should use `--font-size-500` with `--color-neutral-600`. Use `var()` tokens exclusively — no hardcoded colors, spacing, or font sizes. Include a `focus-visible` outline for keyboard navigation.
**Files:** `src/features/follows/components/follow-button/follow-button.module.scss`
**AC:** Three distinct visual states are styled using project design tokens. Minimum 44px tap target on the button. `pnpm lint:styles` passes. Mobile-first — no `max-width` media queries.
**Expert Domains:** scss

### Task 2.2: Create FollowButton component with optimistic toggle and auth gate

Build the FollowButton as a `'use client'` component in the follows feature. Wire up `useFollowStatus` and `useFollowerCount` for current state, and `useFollowToggle` for the mutation. The component must: (1) Show "Follow" (outline) when not following, "Following" (filled) when following, and switch text to "Unfollow" (danger) on hover/focus of the "Following" state; (2) Check `useAuth().isAuthenticated` before toggling — if not authenticated, show a sign-in toast via `useToast()` with message "Sign in to follow" and description "Create an account or sign in to follow {targetName}." and return early; (3) Display follower count next to the button using `useFollowerCount` data, falling back to `initialFollowerCount` prop while the query loads; (4) Call `useFollowToggle.mutate(isFollowing)` on click, which already handles optimistic count +1/-1 and rollback; (5) Pass `onSuccess` to `useFollowToggle` that shows a toast: "Now following {targetName}" or "Unfollowed {targetName}"; (6) Pass `onError` to `useFollowToggle` that shows an error toast. ARIA requirements: `aria-pressed` reflecting follow state, `aria-label` like "Follow {targetName}" or "Following {targetName}, activate to unfollow", `aria-busy` when mutation is pending. Use the `useCallback` hook for the click handler. Import `useToast` from `@/components/indicators/toast/context`.
**Files:** `src/features/follows/components/follow-button/index.tsx`
**AC:** Component renders three visual states based on follow status and hover. Unauthenticated click triggers sign-in toast (no mutation). Authenticated click triggers follow/unfollow with optimistic count update. `aria-pressed`, `aria-label`, and `aria-busy` are set correctly. Follower count displays beside the button. `pnpm typecheck` passes.
**Reuses:** `src/components/indicators/toast/context.tsx` (useToast), `src/features/auth/context.tsx` (useAuth), `src/features/follows/hooks/use-follow-toggle.ts`, `src/features/follows/hooks/use-follow-status.ts`, `src/features/follows/hooks/use-follower-count.ts`
**Expert Domains:** state-management

### Task 2.3: Export FollowButton from the follows barrel

Add the FollowButton component to the follows feature barrel export so consuming features can import it as `import { FollowButton } from '@/features/follows'`.
**Files:** `src/features/follows/index.ts`
**AC:** `FollowButton` is importable from `@/features/follows`. `pnpm build` passes.

## Phase 3: Documentation and feature CLAUDE.md update

**Goal:** Update the follows feature CLAUDE.md to document the new FollowButton component, its props, visual states, and integration pattern
**Verify:** `pnpm build`

### Task 3.1: Update follows CLAUDE.md with FollowButton documentation

Add a Components section to `src/features/follows/CLAUDE.md` documenting FollowButton: its purpose, props table, visual states (Follow/Following/Unfollow), auth gate behavior, toast messages, ARIA attributes, and usage example showing how to render it on a member profile or shop page. Update the Directory Structure section to include the new `components/follow-button/` directory. Add a note in Key Patterns about the auth gate pattern (unauthenticated users get toast instead of redirect).
**Files:** `src/features/follows/CLAUDE.md`
**AC:** CLAUDE.md includes a Components section with FollowButton documentation. Directory structure reflects the new files. A usage example is provided showing import from the barrel and props usage.

### Task 3.2: Update follows barrel index to include complete public API

Verify the barrel export in `src/features/follows/index.ts` includes all types (including `FollowButtonProps`) and the `FollowButton` component. This is a verification/cleanup task to ensure the public API is complete and consistent with what CLAUDE.md documents.
**Files:** `src/features/follows/index.ts`
**AC:** All public types and the FollowButton component are exported from the barrel. The exports match what CLAUDE.md documents in the Public API section.
