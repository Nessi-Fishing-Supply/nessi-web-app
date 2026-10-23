# Review Findings — #220

## Cycle 1

### [B] Scroll lock race on resize — FIXED

SlidePanel body scroll lock fired unconditionally on mount. Fixed by guarding behind `isOpen && !isDesktop`.

### [B] Not-found state invisible on mobile — FIXED

Not-found rendered inside `.detailColumn` (display: none on mobile). Moved inside SlidePanel.

### [W] URL param preservation — FIXED

`handleSelectOrder` now uses `URLSearchParams` to preserve existing params.

### [W] Seller name not a link — DEFERRED

`OrderWithListing.seller` only has first/last name, no slug or member ID. Needs a schema join change.

### [W] orderId not URL-encoded — ACCEPTED

UUIDs are URL-safe. Defensive encoding adds no practical value here.

### [W] Skeleton hardcoded px — ACCEPTED

Skeleton dimensions need to match rendered output precisely. Spacing tokens don't map to these values.

### [I] Redundant `mounted` check — accepted, harmless

### [I] Redundant desktop breakpoint mixin — accepted, harmless

### [I] Proxy guard verified — confirmed covered
