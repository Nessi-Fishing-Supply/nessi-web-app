# Review Findings — #56 Real-time Messaging

## [W1] Connection state tracking not implemented

The realtime utility doesn't track WebSocket connection state. The ConnectionStatus component exists but has no way to know when connections drop/recover.

## [W2] ConnectionStatus not wired into thread page

Component was created but never rendered in the thread detail page.

## [W3] Browser notification dispatch not wired

`showBrowserNotification` utility exists but `useRealtimeNotifications` never calls it when a new notification arrives.

## [W4] Verify Supabase client singleton behavior

Each `subscribeToTable` / `createBroadcastChannel` call creates a new `createClient()` — need to verify if `createBrowserClient` returns a singleton or creates new instances.

## [W5] No debounce on typing broadcast

`startTyping()` fires on every keystroke without throttling.

## [I1] Read receipts not truly realtime

Read indicator updates when the thread data is refetched, not via a realtime subscription on `last_read_at`.

## [I2] Transaction history gate uses stub heuristic

`hasTransactionHistoryServer` checks `total_transactions > 0` instead of actual order history (orders table doesn't exist yet).

## [I3] Exponential backoff not implemented

Plan specified reconnection with exponential backoff but Supabase JS handles reconnection internally.
