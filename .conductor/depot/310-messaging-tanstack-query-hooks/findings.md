# Review Findings: #310

## [W] useCreateThread 409 handling does not call onSuccess

**File:** `src/features/messaging/hooks/use-create-thread.ts:24-28`
The 409 path returns early (suppressing onError) but never calls onSuccess. The consuming UI won't know the thread was found. Root cause: FetchError doesn't carry response body. Fix when building thread creation UI — either update client service to return on 409 or pass thread data through error.

## [W] useSendMessage optimistic message has empty sender fields

**File:** `src/features/messaging/hooks/use-send-message.ts:23-35`
Optimistic message uses empty strings for sender_id/first_name/last_name. Will cause a brief UI glitch (empty name, no avatar) before server response. Fix when building messaging UI — accept current user context in hook options.

## [I] useSendMessage uses `any` for setQueryData callback

**File:** `src/features/messaging/hooks/use-send-message.ts:37`
Could use `InfiniteData<MessagesPage>` generic instead of `any`. Project allows `any` so not a lint issue.

## [I] useMarkRead uses JSON.stringify for query key snapshots

**File:** `src/features/messaging/hooks/use-mark-read.ts:22-32`
Pragmatic approach for multi-cache rollback. Works correctly for the string/undefined key values used here.
