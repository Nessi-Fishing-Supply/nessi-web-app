# Learnings — #125

## Cart API Route Patterns
- All cart routes follow the same auth → delegate → respond pattern as listings routes
- Error mapping from service throw messages to HTTP status codes works cleanly for the cart domain
- The `addToCartServer` function takes a `_priceCents` parameter it ignores — the API passes 0 as a placeholder since the service snapshots from DB
- POST /api/cart/merge does input validation (Array.isArray check) at the route level; the server service handles all business validation (UUID format, listing existence, duplicates, own-listing, cart cap)
- Dynamic route params in Next.js 16 use `context: { params: Promise<{ id: string }> }` with `await context.params`
