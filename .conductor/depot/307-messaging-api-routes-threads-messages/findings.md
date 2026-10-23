# Review Findings — #307 Messaging API Routes

## [W] is_filtered/original_content stored in metadata instead of dedicated columns

The `messages` table has dedicated `is_filtered` and `original_content` columns, but the POST
handler stores filter data in `metadata` JSONB. Fix: extend `createMessageServer` to accept and
write these fields directly.

**Status:** Fixing

## [W] Nudge message sender_id set to triggering user instead of system identity

Nudge messages are system-generated but attributed to the user. Fix: use the message metadata to
mark nudge origin so the frontend can render appropriately.

**Status:** Fixing

## [W] POST /threads does not verify authenticated user is in participantIds

A user could create a thread between two other users. Fix: add validation check.

**Status:** Fixing
