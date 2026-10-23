# Review Findings — #312

## [B] Blocking

**B1:** Dual `useThreads` calls cause redundant network requests. Fix: single query + client-side filter.
**B2:** Unread dot is `aria-hidden` with no screen reader alternative. Fix: add `.sr-only` "Unread" text.

## [W] Warning

**W1:** Relative import path in thread-row.module.scss — use `@/styles/mixins/breakpoints` alias.
**W2:** Inline styles on ThreadList `<ul>` — use SCSS module instead.
**W3:** Button inside Link creates nested interactive elements — use Link styled as button or router.push.

## [I] Info

**I1:** `formatRelativeTime` could be extracted as shared utility (future).
**I2:** Suspense boundary has no fallback (matches watchlist pattern — acceptable).
**I3:** Empty descriptions for "All" and "Inquiries" tabs are identical (intentional).
