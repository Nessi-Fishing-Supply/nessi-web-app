# Review Findings: #126

## [W] subscribe does not filter storage events by key
- **Check:** Code Review
- **File:** `src/features/cart/utils/guest-cart.ts:57`
- **Issue:** The `storage` event fires for any localStorage key change from another tab, causing unnecessary snapshot recalculation
- **Fix:** Wrap callback to check `event.key === STORAGE_KEY || event.key === null`

## [W] addToGuestCart silently ignores full-cart and duplicate with no feedback
- **Check:** Code Review
- **File:** `src/features/cart/utils/guest-cart.ts:39-40`
- **Issue:** Calling code cannot distinguish success from failure without pre-checking count/isInCart
- **Fix:** Return a discriminator type: `'added' | 'full' | 'duplicate'`

## [I] Module-level mutable cache in hook file is intentional for useSyncExternalStore
## [I] No validation of GuestCartItem shape on read (server-side merge validates instead)
## [I] Test runner runs all test files despite path filter (CI config detail)
