# Learnings — #236

## Phase 1: Database Migration

- **RLS policy dependency ordering**: When dropping a column that's referenced by an RLS policy on _another_ table (e.g., `shops` policy referencing `shop_members.role`), you must DROP the policy BEFORE dropping the column. PostgreSQL treats this as a cross-table dependency and won't cascade automatically.
- **Deterministic UUIDs**: Using simple patterned UUIDs like `11111111-1111-1111-1111-11111111110X` for system roles is cleaner than `uuid_generate_v5` — no extension needed, easy to identify in queries, and trivial to use as application constants.
- **NULL in UNIQUE constraints**: PostgreSQL treats `NULL != NULL`, so `UNIQUE(shop_id, slug)` allows duplicate slugs when `shop_id IS NULL`. Solution: two partial unique indexes — one for `shop_id IS NOT NULL` and one for `shop_id IS NULL`.
