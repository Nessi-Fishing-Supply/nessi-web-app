# Review Findings — #252

## [B] listUsers pagination is O(N) on all users

- **File:** `src/app/api/shops/[id]/invites/route.ts:81-96`
- **Fix:** Replace paginated listUsers with a single-query approach

## [W] Resend reuses original token instead of regenerating

- **File:** `src/app/api/shops/[id]/invites/[inviteId]/resend/route.ts:55`
- **Fix:** Generate new token on resend for security

## [W] Resend does not check expires_at for already-expired invites

- **File:** `src/app/api/shops/[id]/invites/[inviteId]/resend/route.ts:44`
- **Fix:** Allow resending expired-but-pending invites (current behavior is correct since resend resets expiry)

## [W] inviterName can be empty string when both names are null

- **File:** `src/app/api/shops/[id]/invites/route.ts:177`
- **Fix:** Add fallback for empty inviter name

## [W] GET list uses admin client for reads

- **File:** `src/app/api/shops/[id]/invites/route.ts:211`
- **Fix:** Acceptable — matches codebase pattern, RLS may not grant direct read access

## [I] No unit tests

## [I] ShopInviteWithInviter coupled to join alias

## [I] 7-day expiry magic number duplicated
