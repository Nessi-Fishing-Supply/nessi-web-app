# Review Findings — #206

## [B] Blocking

1. **Auth check allows unauthenticated userId** — `route.ts:85`: Guard short-circuits when `user` is null. Fix: `if (!user || user.id !== userId)`.
2. **excludeListingId not applied in similar mode** — `recommendation-server.ts`: declared but unused. Fix: add conditional `.neq('id', excludeListingId)`.

## [W] Warning

3. **No UUID validation on client-supplied listingIds** — Fix: add UUID regex filter before query.
4. **getRecentlyViewedIds not in barrel** — Intentional: server-only import would break client build.
5. **Source category fetch doesn't filter status=active** — Intentional: better UX.
6. **Query key includes both userId and listingIds** — Minor cache inefficiency, acceptable.

## [I] Info

7. Invalid condition degrades silently (returns tier 0 neighbors)
8. No server-only guard (consistent with codebase)
9. Multiple createClient calls per request (consistent pattern)
10. Pre-existing: useDuplicateListing not in barrel
