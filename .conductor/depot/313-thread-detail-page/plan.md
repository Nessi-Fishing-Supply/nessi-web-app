# Implementation Plan: #313 — Thread detail page

## Overview

4 phases, 17 total tasks
Estimated scope: large

## Phase 1: Route shell, page header, and compose bar

**Goal:** Create the thread detail route with a server component shell, client page skeleton, back navigation via PageHeader, and the compose bar component with auto-expanding textarea and send functionality
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 1.1: Create the server component route shell at `/messages/[thread_id]`

Create the Next.js server component page that renders metadata and wraps the client component in Suspense. Follow the exact pattern from the inbox page (`src/app/(frontend)/messages/page.tsx`) — export metadata, render `<Suspense>` around the client component. The `params` must be awaited (Next.js 15+ async params).
**Files:** `src/app/(frontend)/messages/[thread_id]/page.tsx`
**AC:** Route `/messages/{thread_id}` resolves without errors; page exports metadata with title "Messages"; server component passes `threadId` param to client component
**Expert Domains:** nextjs

### Task 1.2: Create the thread detail client page skeleton with loading, error, and data states

Create the client component that fetches thread data via `useThread(threadId)` and messages via `useMessages(threadId)`. Include loading skeleton (shimmer pattern matching inbox), error state via `ErrorState` component, and a back button using the existing `PageHeader` component navigating to `/messages`. Call `useMarkRead()` on mount to mark the thread as read. Render placeholder divs for the message list and compose bar areas — those will be filled in subsequent tasks.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** Page fetches thread and messages on mount; loading skeleton renders during fetch; error state renders on failure with retry; back button navigates to `/messages`; `markThreadRead` is called once on mount; page layout uses mobile-first flexbox (full viewport height minus navbar)
**Reuses:** `src/components/layout/page-header/`, `src/components/indicators/error-state/`
**Expert Domains:** nextjs, state-management, scss

### Task 1.3: Create the compose bar component with auto-expanding textarea and send button

Build the compose bar with a native `<textarea>` that auto-expands as the user types (adjusting `scrollHeight`), a send button (disabled when input is empty or mutation is pending), and a placeholder `+` button for future action menu. Use `useSendMessage` hook. Clear input on successful send. The textarea must NOT use the existing `TextArea` component (which is react-hook-form coupled) — use a plain controlled textarea with auto-resize via ref. Wrap in `role="form"` with `aria-label="Compose message"`.
**Files:** `src/features/messaging/components/compose-bar/index.tsx`, `src/features/messaging/components/compose-bar/compose-bar.module.scss`
**AC:** Textarea auto-expands up to 5 lines then scrolls; send button disabled when empty or pending; `aria-busy` on send button when pending; input clears on success; `role="form"` with `aria-label`; mobile-first sticky bottom layout; minimum 44px tap target on all interactive elements; Enter sends (Shift+Enter for newline)
**Expert Domains:** scss

### Task 1.4: Wire compose bar into the thread detail page

Import and render the `ComposeBar` at the bottom of the thread detail page. Pass `threadId` so the compose bar can use `useSendMessage`. The page layout should be a flex column: header at top, scrollable message area in the middle (flex: 1, overflow-y: auto), compose bar pinned at bottom.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** Compose bar renders at the bottom of the thread detail page; sending a message clears the input; page layout is flex column with scrollable middle section; compose bar stays visible when messages overflow
**Expert Domains:** scss

## Phase 2: Message bubbles, date separators, and message nodes

**Goal:** Replace the scaffold message-thread component with production message bubbles supporting all message types (text, system, nudge, listing_node, offer_node), date separators, and proper sender/receiver alignment
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 2.1: Create the message node component for system and nudge messages

Build a component that renders non-bubble message types: system messages (centered, muted text, no bubble) and nudge messages (centered info banner using the `InlineBanner` component with `variant="info"`). Accept `message: MessageWithSender` and render based on `message.type`. System messages show content as plain centered text. Nudge messages show content in an `InlineBanner`.
**Files:** `src/features/messaging/components/message-node/index.tsx`, `src/features/messaging/components/message-node/message-node.module.scss`
**AC:** System messages render centered with muted color, no bubble; nudge messages render as info banners; component handles `type === 'system'` and `type === 'nudge'`; `aria-label` describes the message type for screen readers
**Reuses:** `src/components/indicators/inline-banner/`
**Expert Domains:** scss

### Task 2.2: Create the listing node component for inline listing cards

Build a component that renders a `listing_node` message type as an inline listing card within the message thread. Extract listing data from `message.metadata` (which contains a snapshot: `{ listing_id, title, price_cents, image_url, status }`). Render a compact card with thumbnail via `next/image`, title, and formatted price. Link to `/listing/{listing_id}`.
**Files:** `src/features/messaging/components/message-node/listing-node.tsx`
**AC:** Listing node renders compact card with thumbnail (via `next/image` with `sizes="80px"`), title, and price; links to listing page; handles null/missing metadata gracefully; mobile-first card layout
**Expert Domains:** scss, nextjs

### Task 2.3: Upgrade the offer bubble component to use real offer data

Upgrade the existing `OfferBubble` scaffold to accept `OfferWithDetails` or extract offer data from message metadata. Add support for the `countered` and `expired` statuses (scaffold only handles pending/accepted/declined). Wire offer action buttons to `useOfferActions` hook. The component should determine whether to show action buttons based on whether the current user is the seller and the offer is pending.
**Files:** `src/features/messaging/components/offer-bubble/index.tsx`, `src/features/messaging/components/offer-bubble/offer-bubble.module.scss`
**AC:** Renders all 5 offer statuses (pending, accepted, declined, countered, expired) with appropriate status badges; action buttons only show for seller on pending offers; countdown timer updates every minute for pending offers; `countered` shows "Countered" badge; `expired` shows "Expired" badge; existing tests still pass (may need updates for new statuses)
**Expert Domains:** state-management

### Task 2.4: Replace the scaffold message-thread with production message list

Replace the scaffold `MessageThread` component with a production implementation that renders `MessageWithSender[]` from the infinite query. For each message, determine rendering: `text` type renders as bubble (sender right, receiver left with avatar via `Avatar` component); `system` and `nudge` delegate to `MessageNode`; `listing_node` delegates to `ListingNode`; `offer_node` delegates to `OfferBubble`. Add date separators between messages from different days. Use `role="log"` with `aria-live="polite"` on the message container. Each bubble gets `aria-label` with sender name and timestamp.
**Files:** `src/features/messaging/components/message-thread/index.tsx`, `src/features/messaging/components/message-thread/message-thread.module.scss`
**AC:** Text messages: sender right (primary bg), receiver left (neutral bg) with Avatar; system/nudge/listing_node/offer_node delegate to their respective components; date separators render between different days; `role="log"` with `aria-live="polite"` on container; each message has `aria-label`; avatars use `next/image` via the Avatar component; existing tests updated to match new `MessageWithSender` prop interface
**Reuses:** `src/components/controls/avatar/`
**Expert Domains:** scss

### Task 2.5: Wire message list into the thread detail page with scroll-to-bottom

Integrate the production `MessageThread` into the thread detail page. Flatten pages from the infinite query into a single chronologically-ordered array (the API returns newest-first per page, so reverse each page and concatenate). Scroll to the bottom on initial data load using a ref on the scroll container. Pass `currentUserId` from `useAuth()` to determine sender/receiver alignment.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
**AC:** Messages render chronologically (oldest at top, newest at bottom); scroll container starts at the bottom on initial load; message list updates when new messages arrive via optimistic update; `currentUserId` correctly determines left/right alignment
**Expert Domains:** state-management

## Phase 3: Collapsible header and infinite scroll

**Goal:** Add the collapsible context header (listing card for inquiry, offer status for offer, member card for direct) and implement infinite scroll to load older messages at the top
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 3.1: Create the collapsible header component with thread-type-specific content

Build the collapsible header that renders contextual information based on thread type. For `inquiry`: show listing title, thumbnail, price, and link to listing page. For `offer`: show listing info plus offer amount, status pill (via `Pill` component), and accept/counter/decline action buttons for the seller. For `direct`: show other participant's name, avatar, and link to profile. For `custom_request`: show placeholder text. Use IntersectionObserver or scroll position to collapse to a slim bar (showing only thread type badge and participant name) when the user scrolls down. Sticky position at top. `aria-expanded` attribute reflects collapsed state.
**Files:** `src/features/messaging/components/collapsible-header/index.tsx`, `src/features/messaging/components/collapsible-header/collapsible-header.module.scss`
**AC:** Inquiry threads show listing card with thumbnail, title, price; offer threads show listing + offer status pill + action buttons for seller; direct threads show participant avatar + name; collapses to slim bar on scroll; `aria-expanded` toggles; sticky positioning; mobile-first layout; tapping collapsed bar expands it
**Reuses:** `src/components/controls/avatar/`, `src/components/indicators/pill/`, `src/features/messaging/components/type-badge/`
**Expert Domains:** scss

### Task 3.2: Wire collapsible header into the thread detail page

Import and render the `CollapsibleHeader` between the `PageHeader` and the message list. Pass thread data and current user ID. Connect the scroll container's scroll events to the header's collapsed state. For offer threads, fetch the active offer via `useOffer` if the thread has an associated offer (check `message.metadata` or thread-level offer reference).
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** Collapsible header renders below the back button and above the message list; header collapses when user scrolls messages; correct content renders per thread type; offer threads show live offer status

### Task 3.3: Implement infinite scroll to load older messages at the top

Add a scroll sentinel at the top of the message list. When the sentinel enters the viewport (via IntersectionObserver), call `fetchNextPage()` from the `useMessages` infinite query. After new messages load, preserve the scroll position so the user doesn't jump to the top. Show a small loading spinner at the top while fetching. Disable the sentinel when `hasNextPage` is false.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/features/messaging/components/message-thread/index.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** Scrolling to top triggers loading of older messages; scroll position preserved after new page loads (user stays at same visual position); loading spinner shows at top during fetch; stops fetching when `hasNextPage` is false; works smoothly on mobile
**Expert Domains:** state-management

## Phase 4: Polish, edge cases, and accessibility

**Goal:** Handle edge cases (empty threads, blocked threads, archived threads), refine accessibility, add loading/transition states, and update the messaging CLAUDE.md
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 4.1: Add empty thread state and edge case handling

Handle the case where a thread exists but has no messages yet (show a prompt like "Start the conversation"). Handle archived/closed thread status by disabling the compose bar and showing an inline banner. Handle the case where the thread is not found (404 from API) by showing an error state with a back button.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** Empty threads show encouraging prompt; archived/closed threads disable compose bar with explanatory banner; 404 thread shows error state with back navigation; all states are mobile-friendly
**Reuses:** `src/components/indicators/inline-banner/`
**Expert Domains:** scss

### Task 4.2: Add loading skeleton for the thread detail page

Create a purpose-built loading skeleton for the thread detail page: a slim header skeleton, 4-6 message bubble skeletons (alternating left/right alignment to simulate a conversation), and a compose bar skeleton at the bottom. Use the shimmer animation pattern from the inbox page.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** Loading skeleton shows header placeholder, alternating left/right bubble placeholders, and compose bar placeholder; uses shimmer animation consistent with inbox; `role="status"` with sr-only loading text
**Expert Domains:** scss

### Task 4.3: Accessibility audit and refinements

Review all new components for WCAG 2.1 AA compliance. Ensure: `role="log"` with `aria-live="polite"` on message container so new messages are announced; compose form has `role="form"` with `aria-label`; all buttons have `aria-label` when icon-only; `aria-expanded` on collapsible header; focus management — when compose bar sends, focus returns to textarea; all tap targets are minimum 44x44px; date separators are screen-reader accessible.
**Files:** `src/features/messaging/components/message-thread/index.tsx`, `src/features/messaging/components/compose-bar/index.tsx`, `src/features/messaging/components/collapsible-header/index.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
**AC:** `role="log"` on message list; `aria-live="polite"` announces new messages; compose bar focus returns to textarea after send; all icon buttons have `aria-label`; `aria-expanded` on collapsible header; minimum 44px tap targets on all interactive elements; date separators use `role="separator"` or equivalent

### Task 4.4: Update existing tests for replaced scaffold components

Update the existing tests in `message-thread/__tests__/index.test.tsx` and `offer-bubble/__tests__/index.test.tsx` to match the new production component interfaces. The `MessageThread` component now accepts `MessageWithSender[]` instead of `MessageItem[]`. The `OfferBubble` now handles all 5 statuses. Add test cases for system messages, nudge messages, and date separators.
**Files:** `src/features/messaging/components/message-thread/__tests__/index.test.tsx`, `src/features/messaging/components/offer-bubble/__tests__/index.test.tsx`
**AC:** All existing test assertions pass with updated props; new tests cover system message rendering, nudge message rendering, date separator rendering, and all 5 offer statuses; `pnpm test:run` passes

### Task 4.5: Update messaging CLAUDE.md with thread detail component documentation

Document the new components (CollapsibleHeader, ComposeBar, MessageNode, ListingNode) and the updated components (MessageThread, OfferBubble) in the messaging feature CLAUDE.md. Update the directory structure section and component descriptions.
**Files:** `src/features/messaging/CLAUDE.md`
**AC:** CLAUDE.md documents all new and updated components with props, file paths, and behavior descriptions; directory structure section reflects the new files
