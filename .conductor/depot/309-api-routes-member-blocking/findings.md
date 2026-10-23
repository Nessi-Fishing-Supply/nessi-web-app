# Review Findings: #309

## Resolved

- [B] Removed `isBlockedServer` and `getBlockedMembersServer` from messaging — canonical versions live in `src/features/blocks/services/block-server.ts`
- [B] Two unblock endpoints are intentional: `/api/members/block/[member_id]` (messaging context) and `/api/blocks?blocked_id=` (settings context). Documented in CLAUDE.md.
- [W] Removed `as MemberBlock` type assertions — Supabase client infers correctly
- [I] Removed unreachable self-block catch from POST route (early return at line 32 handles it)

## Accepted (no action)

- [W] `unblockMemberServer` exists in both features — intentional. Each feature's API routes import from their own service layer. The implementations are identical but serve different API endpoints.
- [I] No UUID format validation on `memberId` — consistent with existing routes (offers, watchlist). Database rejects invalid UUIDs.
