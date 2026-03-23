# Preflight Findings — #130

## [W] Missing onError handler in useCartMerge
- **Check:** Code Review
- **File:** `src/features/cart/hooks/use-cart-merge.ts` (lines 26-49)
- **Issue:** The `mergeGuestCart` mutation has no `onError` callback. If the merge API fails (network error, server 500), the user gets no feedback and their badge count drops to 0 while guest items are silently orphaned in localStorage.
- **Fix:** Add `onError` callback showing a toast like "Could not merge your guest cart. Please try adding items again."

## [I] Badge border-radius uses single token (improvement over plan)
- **Check:** Code Review
- **File:** `src/features/cart/components/cart-icon/cart-icon.module.scss`
- **Note:** Uses `var(--spacing-300)` for all cases instead of conditional 50%/token. Better approach.

## [I] Toast message wording improved from plan
- **Check:** Code Review
- **File:** `src/features/cart/hooks/use-cart-merge.ts`
- **Note:** Uses structured `{ message, description, type }` instead of flat string. Better UX.
