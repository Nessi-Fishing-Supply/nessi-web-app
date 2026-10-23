# Review Findings — #315

## [W] createThread misses 403 context revocation handling

- **File:** `src/features/messaging/services/messaging.ts`
- **Issue:** Custom fetch bypasses shared `request` function's 403 handling
- **Fix:** Add 403 check with `handleContextRevocation()` before generic error throw

## [W] useUnreadCount fires for unauthenticated visitors

- **File:** `src/components/navigation/navbar/index.tsx`
- **Issue:** Hook polls every 60s even for logged-out users, causing wasted 401 requests
- **Fix:** Add `enabled` parameter to `useUnreadCount` and pass `isAuthenticated`

## [W] Missing spacing on .profileActions in member profile

- **File:** `src/app/(frontend)/member/[slug]/member-profile.module.scss`
- **Issue:** No top margin on button container, may look cramped
- **Fix:** Add `margin-top: var(--spacing-300)`

## [I] MessageButton uses custom SCSS instead of shared Button component

## [I] messageLink uses explicit transition timing instead of design token

## [I] useUnreadCount not gated by isAuthenticated in hook call (plan deviation)
