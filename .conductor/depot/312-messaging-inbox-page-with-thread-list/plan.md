# Implementation Plan: #312 — Messaging: Inbox page with thread list and tab filtering

## Overview

3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Foundation — Proxy update, type badge, and thread list container

**Goal:** Protect the `/messages` route, create the type badge component for thread type display, and scaffold the thread list container that maps threads to rows.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 1.1: Add `/messages` to proxy.ts protected paths

Add `/messages` to the authentication guard in `src/proxy.ts` alongside the existing `/dashboard`, `/shop/transfer`, and `/watchlist` checks. Unauthenticated users visiting `/messages` should be redirected to `/`.

**Files:** `src/proxy.ts`
**AC:** Unauthenticated requests to `/messages` are redirected to `/`. The condition sits alongside the existing `startsWith('/dashboard')` and `startsWith('/watchlist')` checks.
**Expert Domains:** nextjs

### Task 1.2: Create the type badge component

Create a small colored pill component that displays the thread type label. Props: `type: ThreadType`. Color mapping: `inquiry` = primary (blue), `offer` = warning (amber), `direct` = default (gray), `custom_request` = secondary (purple). Reuse the existing `Pill` component from `src/components/indicators/pill/` by wrapping it with the correct color mapping and human-readable labels (e.g., `custom_request` displays as "Custom Request").

**Files:** `src/features/messaging/components/type-badge/index.tsx`, `src/features/messaging/components/type-badge/type-badge.module.scss`
**Reuses:** `src/components/indicators/pill/`
**AC:** `<TypeBadge type="inquiry" />` renders a blue pill with text "Inquiry". `<TypeBadge type="custom_request" />` renders a purple pill with text "Custom Request". All four thread types render with the correct color and label.
**Expert Domains:** scss

### Task 1.3: Create the thread row component

Create `ThreadRow` — a single row in the thread list. Displays the other participant's avatar (using the existing `Avatar` component at `md` / 40px size), their name (bold if unread), a `TypeBadge`, the `last_message_preview` truncated to one line via CSS (`text-overflow: ellipsis`), a relative timestamp (e.g., "2m ago", "3h ago", "Yesterday"), and a blue dot indicator when `my_unread_count > 0`. The entire row is a clickable `Link` to `/messages/{thread_id}`. Accept `ThreadWithParticipants` and `currentUserId` as props. Extract the "other participant" by filtering out the current user from the participants array.

**Files:** `src/features/messaging/components/thread-list/thread-row.tsx`, `src/features/messaging/components/thread-list/thread-row.module.scss`
**Reuses:** `src/components/controls/avatar/` (size `md`), `src/features/messaging/components/type-badge/`
**AC:** Thread row renders avatar, name, type badge, preview, timestamp, and unread dot. Name is bold when `my_unread_count > 0`. Preview truncates to one line. Row links to `/messages/{thread_id}`. Relative time displays correctly (minutes, hours, days).
**Expert Domains:** scss, nextjs

### Task 1.4: Create the thread list container

Create the `ThreadList` container component that receives a `threads` array and `currentUserId`, maps each thread to a `ThreadRow`, and wraps them in a semantic `<ul>` / `<li>` structure. This is the list wrapper only — loading/empty/error states are handled by the parent inbox page.

**Files:** `src/features/messaging/components/thread-list/index.tsx`
**AC:** `<ThreadList threads={[...]} currentUserId="..." />` renders a `<ul>` with one `<li>` per thread, each containing a `ThreadRow`. The list has no extra loading or empty state logic.
**Expert Domains:** nextjs

## Phase 2: Inbox page with tab filtering

**Goal:** Build the `/messages` route page and the client-side inbox component with horizontal tab filtering, connecting the thread list to the `useThreads` hook.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 2.1: Create the `/messages` server component page

Create the server component shell at `src/app/(frontend)/messages/page.tsx`. Export metadata with `title: 'Messages'`. Render the `InboxPage` client component wrapped in `<Suspense>`, following the exact pattern used by the watchlist page (`src/app/(frontend)/watchlist/page.tsx`).

**Files:** `src/app/(frontend)/messages/page.tsx`
**AC:** `/messages` route exists and renders without errors. Metadata title is "Messages". The page wraps `InboxPage` in `<Suspense>`.
**Expert Domains:** nextjs

### Task 2.2: Create the inbox page client component with tab filtering

Build `InboxPage` as a `'use client'` component. Implement a horizontal tab bar using the existing `Tabs` component from `src/components/controls/tabs/`. Define tab items: All, Inquiries, Offers, Custom Requests, Direct. Map tab indices to `ThreadType | undefined` (index 0 = undefined for "All", 1 = `'inquiry'`, 2 = `'offer'`, 3 = `'custom_request'`, 4 = `'direct'`). Use `useState` for `activeTabIndex` and pass the derived `ThreadType` to `useThreads(type)`. Compute unread counts per tab from threads data (for the "All" tab, sum all; for typed tabs, filter and sum `my_unread_count`). Note: the existing `Tabs` component supports `count` on each `TabItem` — use this for unread counts. Pass fetched threads to the `ThreadList` container. Get `currentUserId` from `useAuth()`.

**Files:** `src/app/(frontend)/messages/inbox-page.tsx`
**Reuses:** `src/components/controls/tabs/` (existing tab component with count support), `src/features/messaging/components/thread-list/`
**AC:** Tab bar renders all five tabs. Selecting "Inquiries" filters to only inquiry threads. Unread count badges appear on tabs. Thread list updates when tab changes. The `useThreads` hook is called with the correct type filter.
**Expert Domains:** nextjs, state-management

### Task 2.3: Add horizontal scroll overflow to the Tabs component for mobile

Extend the existing `Tabs` component styles in `src/components/controls/tabs/tabs.module.scss` to support horizontal scrolling on mobile. Add `overflow-x: auto` and `-webkit-overflow-scrolling: touch` to the `.list` class, with `scrollbar-width: none` and `::-webkit-scrollbar { display: none }` for a clean appearance. This is a non-breaking enhancement that benefits all Tabs consumers.

**Files:** `src/components/controls/tabs/tabs.module.scss`
**AC:** On viewports narrower than 768px, the tab bar scrolls horizontally when tabs overflow. No visible scrollbar. Existing tab styling and behavior is preserved.
**Expert Domains:** scss

## Phase 3: Loading, empty, and error states

**Goal:** Add loading skeletons, empty state, and error state to the inbox page. Ensure full accessibility compliance.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 3.1: Add loading skeleton rows to the inbox page

Create a shimmer skeleton state within `InboxPage` that renders when `isLoading` is true. Display 5 skeleton rows mimicking the thread row layout (avatar circle, two text lines, timestamp area) using CSS shimmer animation. Add `role="status"` and a screen-reader-only `aria-live="polite"` announcement: "Loading your messages". Follow the watchlist page's loading pattern.

**Files:** `src/app/(frontend)/messages/inbox-page.tsx`, `src/app/(frontend)/messages/inbox-page.module.scss`
**AC:** When threads are loading, 5 shimmer skeleton rows appear with `role="status"`. A screen-reader-only live region announces "Loading your messages". Skeletons visually match the thread row dimensions.
**Expert Domains:** scss, nextjs

### Task 3.2: Add empty state to the inbox page

Add an empty state to `InboxPage` that renders when threads are loaded but the array is empty. Display a message icon (`HiOutlineChatAlt2` from `react-icons/hi`), heading "No messages yet", descriptive text that varies by active tab, and a CTA button linking to `/search` ("Browse listings"). Follow the watchlist empty state pattern.

**Files:** `src/app/(frontend)/messages/inbox-page.tsx`, `src/app/(frontend)/messages/inbox-page.module.scss`
**AC:** Empty state renders when threads array is empty. Icon, heading, description, and CTA button are visible. Description varies based on active tab. CTA links to `/search`.
**Expert Domains:** scss, nextjs

### Task 3.3: Add error state with retry to the inbox page

Add an error state to `InboxPage` using the existing `ErrorState` component (banner variant) from `src/components/indicators/error-state/`. When `isError` is true, render the error banner with message "Something went wrong loading your messages" and a retry action that calls `refetch()` from the `useThreads` hook.

**Files:** `src/app/(frontend)/messages/inbox-page.tsx`
**Reuses:** `src/components/indicators/error-state/`
**AC:** When `useThreads` returns an error, the `ErrorState` banner renders with a "Retry" action. Clicking retry calls `refetch()`. The page heading "Messages" remains visible above the error.
**Expert Domains:** nextjs
