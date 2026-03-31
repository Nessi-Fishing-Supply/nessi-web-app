# Review Findings: #311

## Preflight: 6/6 passed

No blocking or warning findings from CI checks.

## Code Review Findings

### [I-1] Counter mutation optimistically sets 'countered' on original offer

The plan said "does NOT modify the original offer cache entry" but the implementation optimistically sets `status: 'countered'`. This is a beneficial deviation — better UX since the user sees the change immediately and `onSettled` invalidation replaces with server truth.

### [I-2] `onSuccess` callback doesn't forward the returned `Offer` object

`useOfferActions` callbacks call `onSuccess?.()` with no arguments. Could forward the `Offer` for API symmetry with `useCreateOffer`. Low priority — can address when a consumer needs it.

### [I-3] Type mismatch in counter `onSuccess` — `Offer` set into `OfferWithDetails` cache

`queryClient.setQueryData(['messages', 'offers', newOffer.id], newOffer)` sets an `Offer` (base type) into a cache where `useOffer` expects `OfferWithDetails` (joined type). Brief window before `onSettled` refetch where `listing`/`buyer`/`seller` would be undefined. Low risk since the counter UI stays on the original offer view.
