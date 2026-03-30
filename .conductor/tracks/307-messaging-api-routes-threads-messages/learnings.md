# Learnings — #307 Messaging API Routes

## Safety Filter Integration Pattern

When integrating the safety filter into message POST routes:

- Use dedicated database columns (`is_filtered`, `original_content`) instead of `metadata` JSONB for queryable filter audit trails
- System-generated messages (nudges) should carry `metadata: { system_generated: true }` so the frontend can render them as system messages rather than user-sent
- The filter runs synchronously before persistence — no async pipeline needed since the regex patterns are compiled at module load

## Duplicate Thread Detection

The `createThreadServer` function returns `{ thread, existing: boolean }` to signal whether a thread was newly created or an existing duplicate was found. The API route maps this to:

- `existing: false` → 201 Created
- `existing: true` → 409 Conflict (returns the existing thread in the response body)

This pattern avoids the need for the client to check for duplicates before creating.

## Block Check on Message Send

Block checks query `member_blocks` at the API route level (before calling `createMessageServer`) rather than in the service. This keeps the service focused on data operations and the route focused on business rules. The block check is directional: it checks if any OTHER participant has blocked the sender, not vice versa.
