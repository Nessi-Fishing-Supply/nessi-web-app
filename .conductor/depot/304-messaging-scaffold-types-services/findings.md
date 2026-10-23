# Review Findings — #304

## Blocking

### [B1] `createThreadServer` returns `MessageThread` instead of `ThreadWithParticipants`

**File:** `messaging-server.ts:175`
Should call `buildThreadsWithParticipants` before returning. Client expects `ThreadWithParticipants`.

### [B2] `createThreadServer` duplicate inquiry lookup uses `.single()` — fails for multi-thread users

**File:** `messaging-server.ts:178-203`
The `.single()` on `message_thread_participants` for the buyer throws if the buyer has multiple threads. Should query `message_threads` directly by listing_id + type, then verify buyer is a participant.

### [B3] `createMessageServer` does not verify sender is a participant

**File:** `messaging-server.ts:368-394`
Plan requires participant verification. Other functions (`getMessagesServer`, `archiveThreadServer`) check this. Missing here.

### [B4] `createMessageServer` does not update thread metadata

**File:** `messaging-server.ts:368-394`
Missing: update `last_message_at`, `last_message_preview` on the thread, and increment `unread_count` for other participants.

### [B5] `createMessageServer` returns `Message` instead of `MessageWithSender`

**File:** `messaging-server.ts:374`
Client service expects `MessageWithSender`. Should fetch sender info and return enriched type.

## Warning

### [W1] `markThreadReadServer` does not verify participant membership

Silent no-op if user is not a participant. Other functions throw errors. Inconsistent.

### [W2] Client `createThread` uses `string[]` for roles instead of `ParticipantRole[]`

**File:** `messaging.ts:13`
Weakens type safety.

### [W3] Client `markThreadRead`/`archiveThread` return `void` but `patch` always parses JSON

**File:** `messaging.ts:34-38`
API routes will need to return JSON. Change to `{ success: boolean }` for safety.

## Info

### [I1] `getThreadsServer` adds optional `type` filter beyond plan — beneficial

### [I2] `getMessagesServer` returns paginated shape `{ messages, nextCursor }` — beneficial

### [I3] Safety filter not invoked in `createMessageServer` — intentional per plan (API route responsibility)
