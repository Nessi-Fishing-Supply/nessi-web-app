# Review Findings: #124

## [W] Warning: Document priceChanged vs valid semantics

`validateCartServer` puts price-changed items in `priceChanged` but not `valid`. Downstream consumers need to know `valid + priceChanged` = purchasable set.
**Resolution:** Added documentation to CLAUDE.md.

## [I] Info: `'expired'` reason is forward-compatible dead code

The DB trigger hard-deletes expired items, so they never reach `validateCartServer`. The type exists for future soft-expire support.

## [I] Info: Multiple Supabase client instantiations in mergeGuestCartServer

Each loop iteration creates additional clients. Lightweight cookie wrappers, acceptable trade-off.

## [I] Info: TOCTOU race on cart cap

Small window between count check and insert could allow 26th item. Acceptable for consumer marketplace; DB constraint would be needed for strict enforcement.

## Preflight Results

- typecheck: PASS
- lint: PASS (0 errors, 4 pre-existing warnings)
- lint:styles: PASS
- format:check: PASS
- build: PASS
