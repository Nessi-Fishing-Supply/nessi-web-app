# Review Findings — #316

## Preflight: 6/6 passed

- TypeScript: pass (1.7s)
- ESLint: pass (10.7s, 2 pre-existing warnings)
- Stylelint: pass (1.6s)
- Prettier: pass (6.7s)
- Tests: pass (5.4s, 592 tests)
- Build: pass (12.9s)

## Code Review: 0 Blocking, 3 Warning, 5 Info

### [W] W1: Unread count 0-to-1 check has a minor race condition

The code queries `unread_count` AFTER `createMessageServer` increments it, filtering for `=== 1` to infer the 0→1 transition. A near-simultaneous second message could also see `=== 1`. In practice this is extremely unlikely (single sender typing) and a duplicate email is harmless. Acceptable as-is.

### [W] W2: Truncation applied twice in message notification path

The route handler truncates `messageContent` to 200 chars before passing as `messagePreview`, then the `newMessage` template also truncates to 200 chars. The template is the correct owner per the plan. The route-level truncation is redundant but harmless.

**Fix:** Remove the route-level truncation — pass `messageContent` directly as `messagePreview`.

### [W] W3: threadUrl in offer-notification.ts is not escaped

The `threadId` is interpolated into `href` attributes without escaping. Since thread IDs are database UUIDs (safe by construction), this is a theoretical concern only. Consistent with `price-drop.ts` pattern.

### [I] I1: Dynamic imports are a valid optimization choice

### [I] I2: Price shown twice in offer emails (body copy + standalone green element)

### [I] I3: `expiring` type defined but not wired — will be used by future cron job

### [I] I4: Counter offer correctly sends counter amount (not original)

### [I] I5: Counter recipient correctly uses `offer.seller_id` (original buyer due to role swap)
