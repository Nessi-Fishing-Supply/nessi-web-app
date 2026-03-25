# Review Findings — #28 Keyword Search

## Preflight: 6/6 passed

- TypeScript: pass
- ESLint: pass (0 errors, 4 pre-existing warnings)
- Stylelint: pass
- Prettier: pass
- Tests: pass (194 tests)
- Build: pass

## Code Review Findings

### [W] Autocomplete missing type grouping and icons

Plan Task 2.1 specified section headers and type icons. Current implementation renders a flat list. Cosmetic — follow-up item.

### [W] Search suggestions uses SELECT+UPDATE instead of atomic upsert

Race condition under concurrent requests. Low impact since it's fire-and-forget analytics. Follow-up: use DB-level `INSERT ... ON CONFLICT DO UPDATE SET popularity = popularity + 1`.

### [W] Search API `ilike` fallback doesn't escape PostgREST special chars

`.or()` string interpolation could break on queries containing `,`, `.`, `(`, `)`. Not an injection risk but a correctness issue. Follow-up item.

### [W] `free_shipping=false` written to URL instead of deleting param — FIXED

Toggling free shipping off wrote `free_shipping=false` to URL, which appeared as an active filter chip. Fixed: boolean `false` now deletes the param.

### [I] Relevance sort doesn't use `ts_rank` ordering

Supabase JS client doesn't expose `ts_rank` in `.textSearch()`. True relevance ordering would require an RPC function. Follow-up for search quality.

### [I] `sort` param counted in active filter count

Changing sort order increments the filter badge. Minor UX consideration.

### [I] Filter-only URLs redirect home

`/search?category=reels` (no `q`) redirects to `/`. Matches plan AC but could be revisited for category-filtered browsing.
