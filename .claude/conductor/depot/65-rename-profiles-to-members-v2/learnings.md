# Learnings — #65 rename profiles to members

## Phase 1
- PostgreSQL `ALTER TABLE RENAME` does NOT auto-rename PK index (`profiles_pkey` remains). This is cosmetic.
- Constraint CHECK expression text is NOT updated when column is renamed — must DROP + recreate.
- PostgreSQL does NOT support `ALTER TRIGGER ... RENAME TO` — must DROP + CREATE.
- Must drop triggers BEFORE dropping the function they reference, otherwise get `2BP01: cannot drop function ... other objects depend on it`.
- `handle_new_user()` function body stores table/column names as string literals — table rename does not update function bodies.

## Phase 2
- Supabase MCP `apply_migration` uses the `%` character literally in PL/pgSQL `RAISE EXCEPTION` — do not double-escape as `%%`. The local migration file should use single `%` as well since it runs as raw SQL through psql.
- Supabase CLI (`supabase gen types`) requires `supabase link` and auth token. The MCP `generate_typescript_types` tool is more reliable for CI/automation.
- Build fails with type errors as expected — app code still references `profiles` table (Ticket 2 scope).
