# Review Log: #309

## Review 1 — 2026-03-31

### Findings
- [B] Duplicate `isBlockedServer` and `getBlockedMembersServer` across messaging and blocks features → FIXED: removed from messaging, canonical versions in blocks feature
- [B] Duplicate unblock endpoints → ACCEPTED: intentional — different UI contexts
- [W] `as MemberBlock` type assertions → FIXED: removed
- [W] Two `unblockMemberServer` implementations → ACCEPTED: each feature serves its own API routes
- [I] Unreachable self-block catch in POST route → FIXED: removed dead code
- [I] No UUID validation → ACCEPTED: consistent with project patterns

### Result
All blocking findings resolved. Passing.
