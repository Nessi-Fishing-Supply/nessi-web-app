# Implementation Plan: #316 — Messaging Email Notifications

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Email Templates

**Goal:** Create the two email template functions (newMessage and offerNotification) following the established pattern in `src/features/email/templates/`
**Verify:** `pnpm build`

### Task 1.1: Create new-message email template

Create the `newMessage` template function that renders an email notification when a user receives a new message. Follow the exact pattern used by `price-drop.ts` and `invite-to-shop.ts`: typed params interface, `escapeHtml()` on all user strings, CTA button linking to `/messages/{threadId}`, fallback link, and `emailLayout()` wrapper. Truncate message preview to 200 characters.
**Files:** `src/features/email/templates/new-message.ts`
**AC:** `newMessage({ senderName: 'John Doe', messagePreview: 'Hey, is this still available?', threadId: 'abc-123' })` returns `{ subject: 'New message from John Doe', html: '...' }` where html contains the escaped sender name, truncated preview, and a CTA button linking to `${NEXT_PUBLIC_APP_URL}/messages/abc-123`. All user-provided strings are HTML-escaped via `escapeHtml()`.
**Expert Domains:** nextjs

### Task 1.2: Create offer-notification email template

Create the `offerNotification` template function that handles all five offer event types: `received`, `accepted`, `declined`, `countered`, and `expiring`. Each type gets a distinct subject line and body copy. The template receives `{ type, listingTitle, amount, senderName, threadId }` and returns `EmailTemplate`. Use `formatPrice()` from `@/features/shared/utils/format` to format the offer amount. Apply `escapeHtml()` to `listingTitle` and `senderName`. Include a CTA button to `/messages/{threadId}`.
**Files:** `src/features/email/templates/offer-notification.ts`
**AC:** Calling `offerNotification({ type: 'received', listingTitle: 'Shimano Reel', amount: 7500, senderName: 'Jane', threadId: 'xyz' })` returns subject `'New offer on Shimano Reel'` and html containing the escaped listing title, formatted price ($75.00), sender name, and CTA link. Each of the 5 types produces a distinct subject line. All user strings are escaped.
**Expert Domains:** nextjs

## Phase 2: Message Send Email Dispatch

**Goal:** Wire up email notifications in the POST message endpoint, checking notification preferences and unread count before sending
**Verify:** `pnpm build`

### Task 2.1: Create a shared notification helper for preference checking and email dispatch

Create a utility function `sendNotificationEmail` in `src/features/messaging/utils/notification-email.ts` that encapsulates the common pattern needed by both message and offer routes: (1) fetch the recipient member's `notification_preferences` from the `members` table using the admin client, (2) check if `email.community_messages` is true (default to true if not set, matching the `parsePreferences` logic in the notifications component), (3) fetch the recipient's email via `supabase.auth.admin.getUserById()`, (4) call `sendEmail()` wrapped in try/catch that silently logs and swallows errors. This avoids duplicating the preference check + admin email lookup + error swallowing in every route handler.
**Files:** `src/features/messaging/utils/notification-email.ts`
**AC:** Exported function `sendNotificationEmail({ recipientId, subject, html })` resolves without throwing regardless of email delivery outcome. Returns `void`. Does NOT send email when the member's `notification_preferences.email.community_messages` is `false`. Logs errors to `console.error` but never throws.
**Expert Domains:** supabase, nextjs

### Task 2.2: Add email dispatch to POST /api/messaging/threads/[thread_id]/messages

After the successful `createMessageServer` call in the POST handler, add email notification logic. Query the `message_thread_participants` table for other participants. For each recipient, check if their `unread_count` was 0 before this message was sent (meaning the increment brought it from 0 to 1). If so, call `sendNotificationEmail` with the `newMessage` template output. Fetch the sender's name from the `members` table (sender is the authenticated user). The email dispatch must not block the API response — use fire-and-forget pattern.
**Files:** `src/app/api/messaging/threads/[thread_id]/messages/route.ts`
**AC:** When a message is sent and the recipient's unread count transitions from 0 to 1, an email is dispatched via `sendNotificationEmail`. When unread count was already >= 1, no email is sent. Email failures do not affect the 201 response. The handler still returns the created message as before.
**Expert Domains:** supabase, nextjs

## Phase 3: Offer Route Email Dispatch

**Goal:** Add email notifications to all four offer lifecycle endpoints (create, accept, decline, counter)
**Verify:** `pnpm build`

### Task 3.5: Add shared helper for fetching offer email context

To avoid duplicating the member name + listing title fetch logic across all four offer routes, create a helper function `getOfferEmailContext` in `src/features/messaging/utils/notification-email.ts` (same file as Task 2.1). This function takes `{ senderId, listingId, supabase }` and returns `{ senderName, listingTitle }` by querying the `members` and `listings` tables. Each offer route calls this helper before constructing the template.
**Files:** `src/features/messaging/utils/notification-email.ts`
**AC:** `getOfferEmailContext({ senderId, listingId, supabase })` returns `{ senderName: string, listingTitle: string }`. Returns fallback values (`'A user'` and `'a listing'`) if queries fail. Does not throw.
**Expert Domains:** supabase, nextjs

### Task 3.1: Add email dispatch to POST /api/offers (offer creation)

After successful offer creation, send an email to the seller notifying them of the new offer. Fetch the buyer's name (the authenticated user) from the `members` table. Fetch the listing title. Use `offerNotification({ type: 'received', ... })` template and `sendNotificationEmail` with the seller's `user_id`. Fire-and-forget.
**Files:** `src/app/api/offers/route.ts`
**AC:** When an offer is created, the seller receives an email with subject containing the listing title and body showing the offer amount. Email failures do not block the 201 response. No email is sent if the seller has `community_messages: false`.
**Expert Domains:** supabase, nextjs

### Task 3.2: Add email dispatch to POST /api/offers/[id]/accept

After successful offer acceptance, send an email to the buyer. Use `offerNotification({ type: 'accepted', ... })` and `sendNotificationEmail` with the buyer's ID.
**Files:** `src/app/api/offers/[id]/accept/route.ts`
**AC:** When an offer is accepted, the buyer receives an email with subject "Your offer was accepted!" and body containing the listing title and offer amount. Email failures do not block the 200 response.
**Expert Domains:** supabase, nextjs

### Task 3.3: Add email dispatch to POST /api/offers/[id]/decline

After successful offer decline, send an email to the buyer. Use `offerNotification({ type: 'declined', ... })` and `sendNotificationEmail` with the buyer's ID.
**Files:** `src/app/api/offers/[id]/decline/route.ts`
**AC:** When an offer is declined, the buyer receives an email with subject "Your offer was declined" and body containing the listing title. Email failures do not block the 200 response.
**Expert Domains:** supabase, nextjs

### Task 3.4: Add email dispatch to POST /api/offers/[id]/counter

After successful counter offer, send an email to the original offerer. Use `offerNotification({ type: 'countered', ... })` with the counter amount.
**Files:** `src/app/api/offers/[id]/counter/route.ts`
**AC:** When a counter offer is made, the original offerer receives an email with subject "Counter offer on {listing}" and body showing the new counter amount. Email failures do not block the 201 response.
**Expert Domains:** supabase, nextjs
