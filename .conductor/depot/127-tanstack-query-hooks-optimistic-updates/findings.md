# Review Findings — #127

## [W] CLAUDE.md useCartBadgeCount description misleading

- **File:** `src/features/cart/CLAUDE.md:68`
- **Issue:** Documentation said both hooks gated by `enabled` flags, but only `useCartCount` has an `enabled` flag
- **Fix:** Updated wording to clarify `useGuestCart` is always active
- **Status:** Fixed

## [I] useRefreshExpiry only invalidates cart key (not cart-count)

- Correct by design — refresh doesn't change count

## [I] useMergeGuestCart clears guest cart in onSuccess (not onSettled)

- Correct by design — preserve guest cart on failure for retry

## Acceptance Criteria: 10/10 PASS
