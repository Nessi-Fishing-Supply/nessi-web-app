# Review Findings — #129

## [W] Warnings

1. **useEffect validation guard** — Add ref guard to prevent repeated validation calls
2. **Seller group key** — Use stable key from seller identity instead of array index
3. **Checkout button a11y** — Use `aria-disabled` only (not `disabled`) to keep focusable
4. **Stale banner title fallback** — Add null-safe fallback for listing title
5. **Remove button tap target** — Expand to 44x44px minimum on mobile for WCAG

## [I] Info

- Guest cart shows minimal info (by design — GuestCartItem lacks listing details)
- groupCartBySeller doesn't expose grouping key (could add for React keys)
- Empty state JSX duplicated for guest/auth (minor DRY)

## Acceptance Criteria: All 14 PASS
