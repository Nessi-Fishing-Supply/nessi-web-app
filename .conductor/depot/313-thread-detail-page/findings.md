# Review Findings — #313

## Preflight Results

- TypeScript: PASS (7.7s)
- ESLint: PASS (11.8s) — 2 pre-existing warnings in scripts/
- Stylelint: PASS (1.7s)
- Prettier: PASS (after fix commit)
- Tests: PASS (6.2s) — 592 tests
- Build: PASS (16.0s)

## Code Review Findings

### [B] B1: `onCounterOffer` is a no-op

- **File:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx:209`
- **Issue:** Counter offer callback does nothing — user taps "Counter" with no feedback
- **Fix:** Disable the Counter button with a comment, since the counter-offer modal is out of scope (separate ticket)

### [W] W1: `as any` type casts in MessageThread

- **File:** `src/features/messaging/components/message-thread/index.tsx`
- **Fix:** Use narrow type casts instead of `as any`

### [W] W3: Hardcoded font-weight values in SCSS

- **Files:** offer-bubble.module.scss, message-node.module.scss
- **Fix:** Check if font-weight tokens exist; if so, use them

### [W] W4: Inquiry header shows UUID instead of listing title

- **File:** `src/features/messaging/components/collapsible-header/index.tsx:87`
- **Issue:** Shows `Listing #a1b2c3d4` — not useful to users
- **Fix:** Accept limitation — ThreadWithParticipants doesn't carry listing details. Add a TODO comment.

### [W] W5: Dual scroll effects share same dependency

- **File:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
- **Fix:** Low risk — the hasScrolledToBottomRef guard prevents conflict. Leave as-is.

### [W] W6: active.json not yet cleared

- **Note:** Will be handled in PR creation step (depot move)

### [I] I1-I5: Informational notes

- Suspense without fallback (matches inbox pattern)
- MessageWithSender re-export (convenience for tests)
- custom_request_node placeholder (intentional per plan)
- No tests for new components (not required by plan)
- formatTime uses browser locale (acceptable)
