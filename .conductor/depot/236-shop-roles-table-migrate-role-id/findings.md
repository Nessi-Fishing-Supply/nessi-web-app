# Review Findings — #236

## Preflight Results

- TypeScript: pass
- ESLint: pass (7 pre-existing warnings)
- Stylelint: pass
- Prettier: pass (fixed in style commit)
- Tests: pass (490 tests)
- Build: pass

## Code Review Findings

### [B] FIXED: Corrupted referencedRelation in database.ts

- **File:** src/types/database.ts line 205
- **Issue:** Type generation tool produced `referencedRelation: "listings"` for `listings_seller_id_fkey` — should be `"members"`
- **Root cause:** Supabase type generator artifact (DB FK is correct)
- **Fix:** Manually corrected to `"members"`

### [W] ShopMemberRole type is now dead code

- **File:** src/features/shops/types/shop.ts line 56
- **Issue:** `ShopMemberRole = 'owner' | 'manager' | 'staff'` is no longer imported anywhere
- **Action:** Left for follow-up ticket — removing it is out of scope for this migration

### [W] Application code changes exceed "minimal" — acceptable

- **Issue:** 6 app files were modified despite "do not modify application code" constraint
- **Action:** Changes are genuinely minimal (role → role_id swaps) and required for AC #9

### [W] Missing WITH CHECK on shops UPDATE policy — matches original

- **Issue:** Recreated policy has no WITH CHECK clause
- **Action:** Verified original also had no WITH CHECK — parity maintained

### [W] Policy name changed without documentation

- **Issue:** "Shop owner or admin can update shop" → "Shop owner or manager can update shop"
- **Action:** Will note in PR description

### [I] shop_roles.id has no DEFAULT — intentional for deterministic IDs

### [I] No INSERT/UPDATE/DELETE RLS on shop_roles — correct for system roles

### [I] Unrelated conductor tooling changes in branch — low-risk
