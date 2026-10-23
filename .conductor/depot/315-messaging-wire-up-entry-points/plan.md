# Implementation Plan: #315 — Messaging — Wire up entry points

## Overview

3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Fix 409 handling in useCreateThread and create shared MessageButton component

**Goal:** Enable `useCreateThread` to return the existing thread on 409 (duplicate), and create a reusable client component for "Message" and "Message Seller" buttons across the app.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 1.1: Update createThread client service to return thread data on 409

The `createThread` function in `src/features/messaging/services/messaging.ts` uses the generic `post` wrapper from `src/libs/fetch.ts`, which throws a `FetchError` on any non-2xx response. On 409, the API returns the existing thread as JSON in the response body, but the current `FetchError` only captures the error message string — the thread data is lost. This means callers cannot navigate to the existing thread on duplicate.

Create a custom `createThread` implementation that calls `fetch` directly (instead of the `post` wrapper). On a 409 response, parse the JSON body and return the thread normally (treating 409 as success). On other non-2xx responses, throw `FetchError` as usual. Keep the `getHeaders` pattern from `src/libs/fetch.ts` for the context header. This is the same pattern described in the CLAUDE.md: "409 treated as success".

Additionally, update the `useCreateThread` hook to remove the special 409 handling in `onError` (the `FetchError` status check at line 29-31), since 409 will now resolve successfully from the service layer.

**Files:**

- `src/features/messaging/services/messaging.ts` (modify `createThread` function)
- `src/features/messaging/hooks/use-create-thread.ts` (remove 409 check in `onError`)
  **AC:** Calling `createThread` with duplicate params returns the existing `ThreadWithParticipants` object instead of throwing. Non-409 errors still throw `FetchError`.
  **Expert Domains:** state-management

### Task 1.2: Create MessageButton client component for profile pages

The member and shop profile pages are server components. They need a "Message" button that calls `useCreateThread` (a client hook). Create a small `'use client'` component `MessageButton` in `src/features/messaging/components/message-button/` that encapsulates the auth gate, thread creation, and navigation logic.

Props: `{ participantId: string; participantName: string; className?: string }`. On click, if not authenticated, show a toast matching the FollowButton pattern: `"Sign in to message — Create an account or sign in to message {participantName}."`. If authenticated, call `useCreateThread` with `{ type: 'direct', participantIds: [currentUserId, participantId], roles: ['initiator', 'recipient'] }`. On success, navigate to `/messages/{thread.id}`. On error, show an error toast. Show `aria-busy` when mutation is pending. Use the same visual style as FollowButton (outline button, `size="sm"`).

**Files:**

- `src/features/messaging/components/message-button/index.tsx` (create)
- `src/features/messaging/components/message-button/message-button.module.scss` (create)
  **AC:** `MessageButton` renders a button that creates a direct thread and navigates to it. Unauthenticated users see a toast. Pending state shows `aria-busy`. Component passes `pnpm build`.
  **Reuses:** `src/features/auth/context.tsx` (useAuth), `src/components/indicators/toast/context.tsx` (useToast)
  **Expert Domains:** nextjs, scss

## Phase 2: Wire up listing detail (Message Seller + Make Offer) and profile pages

**Goal:** Enable the Message Seller button, Make Offer button, and profile Message buttons across all entry points.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 2.1: Enable Message Seller button on listing detail

Replace the disabled `<button>` at line 240 of `listing-detail.tsx` with an active button. On click: if not authenticated, redirect to `{pathname}?login=true` (matching WatchButton pattern). If authenticated, call `useCreateThread` with `{ type: 'inquiry', participantIds: [currentUserId, listing.seller_id], roles: ['buyer', 'seller'], listingId: listing.id }` and navigate to `/messages/{thread.id}` on success. Show error toast on failure. Add `isPending` state for `aria-busy`. The button is already hidden for own listings by the existing `isOwnListing` guard (it only appears in the non-owner action buttons block).

Import `useCreateThread` from `@/features/messaging/hooks/use-create-thread`. Import `useAuth` from `@/features/auth/context`. Use `usePathname` (already imported via `useRouter`'s module) for the auth gate redirect.

Update the `.messageLink` style in `listing-detail.module.scss` to remove `cursor: not-allowed` and add active button styling (underline on hover, primary color, pointer cursor).

**Files:**

- `src/app/(frontend)/listing/[id]/listing-detail.tsx` (modify — replace disabled button with active Message Seller)
- `src/app/(frontend)/listing/[id]/listing-detail.module.scss` (modify — update `.messageLink` styles)
  **AC:** "Message Seller" button creates an inquiry thread and navigates to `/messages/{thread_id}`. Duplicate inquiry navigates to the existing thread. Unauthenticated users are redirected to login. Hidden for own listings.
  **Expert Domains:** nextjs, scss

### Task 2.2: Enable Make Offer buttons on listing detail

Replace the two disabled "Make Offer" `<Button>` elements (lines 201-209 in the `isOwnShopListing` block and lines 231-239 in the default buyer block) with active buttons. Add `useState` for `isOfferSheetOpen`. On click: if not authenticated, redirect to `{pathname}?login=true`. If authenticated, set `isOfferSheetOpen(true)`.

Import `OfferSheet` from `@/features/messaging/components/offer-sheet`. Render `<OfferSheet>` at the bottom of the component (before the lightbox) with props: `isOpen={isOfferSheetOpen}`, `onClose={() => setIsOfferSheetOpen(false)}`, `listingId={listing.id}`, `listingTitle={listing.title}`, `listingPriceCents={listing.price_cents}`, `sellerId={listing.seller_id}`, `mode="create"`.

For `onOfferCreated`, navigate to `/messages/{thread_id}` using the callback's `thread_id` value.

Both Make Offer buttons share the same handler and sheet instance. Keep the existing `disabled` "Buy Now" buttons as-is.

**Files:**

- `src/app/(frontend)/listing/[id]/listing-detail.tsx` (modify — enable Make Offer buttons, add OfferSheet)
  **AC:** "Make Offer" buttons open the OfferSheet. Unauthenticated users are redirected to login. Offer creation navigates to the thread. Hidden for own listings. "Buy Now" buttons remain disabled.
  **Reuses:** `src/features/messaging/components/offer-sheet/index.tsx`
  **Expert Domains:** nextjs

### Task 2.3: Add Message button to member profile page

The member profile page (`src/app/(frontend)/member/[slug]/page.tsx`) is a server component. Import `MessageButton` from `@/features/messaging/components/message-button` and render it below the `FollowButton`, guarded by `!isOwnProfile`. Pass `participantId={member.id}` and `participantName={formatMemberName(member.first_name, member.last_name)}`.

Add a `.profileActions` wrapper style in `member-profile.module.scss` to hold both FollowButton and MessageButton with `display: flex; gap: var(--spacing-200); align-items: center;` and center alignment. Wrap both buttons in this container.

**Files:**

- `src/app/(frontend)/member/[slug]/page.tsx` (modify — add MessageButton)
- `src/app/(frontend)/member/[slug]/member-profile.module.scss` (modify — add `.profileActions` style)
  **AC:** "Message" button appears on member profiles when not own profile. Clicking creates a direct thread and navigates to `/messages/{thread_id}`. Unauthenticated users see a toast.
  **Reuses:** `src/features/messaging/components/message-button/index.tsx`
  **Expert Domains:** nextjs, scss

### Task 2.4: Add Message button to shop profile page

Same as Task 2.3 but for the shop profile page. Import `MessageButton` and render below `FollowButton`, guarded by `!isOwnShop`. Pass `participantId={shop.owner_id}` and `participantName={shop.shop_name}`.

Add a `.profileActions` wrapper in `shop-page.module.scss` with the same flex layout as the member profile.

**Files:**

- `src/app/(frontend)/shop/[slug]/page.tsx` (modify — add MessageButton)
- `src/app/(frontend)/shop/[slug]/shop-page.module.scss` (modify — add `.profileActions` style)
  **AC:** "Message" button appears on shop profiles when not own shop. Clicking creates a direct thread with the shop owner and navigates to `/messages/{thread_id}`. Unauthenticated users see a toast.
  **Reuses:** `src/features/messaging/components/message-button/index.tsx`
  **Expert Domains:** nextjs, scss

## Phase 3: Navbar messages icon, badge, and dropdown link

**Goal:** Add messaging entry points to the navbar: a clickable Messages icon with unread count badge, and a "Messages" link in the account dropdown.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 3.1: Add Messages link to navbar account dropdown

In the navbar's account dropdown (between the "Dashboard" and "Watchlist" `DropdownItem`s), add a new `DropdownItem` with an `AppLink` to `/messages`. Use `HiOutlineChatAlt2` from `react-icons/hi` as the icon (or `HiOutlineChatBubbleLeftRight` from `react-icons/hi2` if available — check which icon sets are used in the project). The label text should be "Messages".

**Files:**

- `src/components/navigation/navbar/index.tsx` (modify — add Messages dropdown item)
  **AC:** "Messages" link appears in the navbar dropdown between "Dashboard" and "Watchlist" for authenticated users. Clicking navigates to `/messages`.
  **Expert Domains:** nextjs

### Task 3.2: Replace static bell icon with Messages link and unread badge

Replace the static `<HiBell>` icon (line 343) with a `<Link href="/messages">` wrapping a messages icon. Import `useUnreadCount` from `@/features/messaging/hooks/use-unread-count`. Call `useUnreadCount()` (only when authenticated) and render a small badge circle showing the count when count > 0.

The badge should be a `<span>` absolutely positioned over the icon (top-right corner). Add styles for the badge in `navbar.module.scss`: `.messagesIconWrapper` (position: relative, display: inline-flex), `.unreadBadge` (position: absolute, top: -4px, right: -4px, min-width: 16px, height: 16px, border-radius: 50%, background: `var(--color-error-500)`, color: white, font-size: `var(--font-size-100)`, font-weight: 700, display: flex, align-items: center, justify-content: center, padding: 0 4px). Hide the badge when count is 0.

Add `aria-label` on the link: "Messages" (or "Messages, {count} unread" when count > 0).

**Files:**

- `src/components/navigation/navbar/index.tsx` (modify — replace HiBell with Messages link + badge)
- `src/components/navigation/navbar/navbar.module.scss` (modify — add `.messagesIconWrapper` and `.unreadBadge` styles)
  **AC:** Authenticated users see a clickable messages icon in the navbar. Unread count badge appears when count > 0 and is hidden when 0. Icon links to `/messages`. Badge polls every 60 seconds (via `useUnreadCount`). Screen readers announce unread count.
  **Expert Domains:** nextjs, scss

### Task 3.3: Run format check and fix any formatting issues

Run `pnpm format` on all modified files to ensure Prettier compliance. Run `pnpm lint:styles` to verify SCSS linting passes. Run the full quality gate: `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`.

**Files:** All files modified in this ticket
**AC:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles` all pass with zero errors.
