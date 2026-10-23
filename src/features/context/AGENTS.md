# Context Feature

## Overview

The context feature manages which entity (member or shop) the user is currently acting as in the Nessi dashboard. This is the architectural backbone for context switching — it determines which identity is active and what data the dashboard displays.

## Architecture

- **stores/context-store.ts** — Zustand store with localStorage persistence managing the active context
- **utils/handle-context-revocation.ts** — Revocation handler utility: switches context to member, cancels in-flight queries, invalidates the query cache, and dispatches a `CustomEvent` for the listener component to display a toast
- **components/context-revocation-listener.tsx** — React component mounted in the dashboard layout that listens for the revocation `CustomEvent` and triggers a toast notification + navigation back to the member dashboard

## ActiveContext Type

Discriminated union representing the two possible active identities:

- `{ type: 'member' }` — user is acting as themselves
- `{ type: 'shop'; shopId: string; shopName?: string }` — user is acting as a shop (shopName is stored for display in revocation toasts without requiring a fetch)

## Store Shape

**State:**

- `activeContext: ActiveContext` — defaults to `{ type: 'member' }`

**Actions:**

| Action                            | Purpose                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `switchToMember()`                | Set active context to the member identity                                     |
| `switchToShop(shopId, shopName?)` | Set active context to a specific shop by ID, optionally storing the shop name |
| `reset()`                         | Clear to default member context (used on logout)                              |

## Persistence

Uses `zustand/middleware` `persist` with localStorage. Storage key: `'nessi-context'`. Defaults to member context when no persisted value exists.

## Access Pattern

The store is wrapped with `createSelectors` from `@/libs/create-selectors`. Access individual slices via auto-generated selectors:

```ts
useContextStore.use.activeContext();
```

## Consumers

- **Navbar** (`src/components/navigation/navbar/`) — displays active identity (member or shop avatar/name), shows context switch dropdown items for available shops
- **Fetch wrapper** (`src/libs/fetch.ts`) — attaches `X-Nessi-Context` header on every request (`member` or `shop:{shopId}`) by reading from `useContextStore.getState()` outside React
- **Query client** (`src/libs/query-client.ts`) — global `onError` callback calls `handleContextRevocation()` when a `FetchError` with status 403 is detected, acting as a safety net for queries that bypass the fetch wrapper

## Context Revocation

When a user is acting as a shop and their access to that shop is revoked (e.g., removed from the shop), subsequent API requests return 403. The revocation flow handles this gracefully without leaving the user in a broken state.

### Event Flow

```
API response 403
  → fetch.ts (or query onError) detects FetchError with status 403
  → handleContextRevocation() called
      → deduplication check: exits if a revocation was already handled within the last 2 seconds
      → switchToMember() — switches the Zustand store back to member context
      → queryClient.cancelQueries() — cancels any in-flight queries
      → queryClient.invalidateQueries() — marks cache as stale so fresh data is fetched for member context
      → window.dispatchEvent(new CustomEvent('nessi:context-revoked', { detail: { shopName } }))
  → ContextRevocationListener (mounted in dashboard layout) receives the event
      → displays a toast: "Access to [shopName] was revoked"
      → navigates to /dashboard (member root)
```

### Deduplication

`handleContextRevocation()` records a timestamp when it first fires. If called again within 2 seconds of the previous invocation it exits immediately. This prevents multiple simultaneous 403 responses (e.g., parallel queries all failing at once) from triggering repeated toasts and navigations.

### FetchError Class

`src/libs/fetch-error.ts` — Custom error class that extends `Error` with a `status: number` property. The fetch wrapper (`src/libs/fetch.ts`) throws a `FetchError` instead of a plain `Error` whenever an API response is not OK, allowing consumers to branch on HTTP status code.

### Tanstack Query Safety Net

`src/libs/query-client.ts` configures a global `onError` in the `QueryCache` constructor. If a query throws a `FetchError` with `status === 403`, it calls `handleContextRevocation()`. This catches cases where query functions make direct fetch calls that are not routed through the shared fetch wrapper.

### Files Involved

| File                                                              | Role                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/libs/fetch-error.ts`                                         | `FetchError` class with `status` property                                            |
| `src/libs/fetch.ts`                                               | Throws `FetchError` on non-OK responses; calls `handleContextRevocation()` on 403    |
| `src/libs/query-client.ts`                                        | Global `QueryCache` `onError` handler as safety net                                  |
| `src/features/context/utils/handle-context-revocation.ts`         | Core revocation handler: dedup, store reset, query cancel/invalidate, event dispatch |
| `src/features/context/components/context-revocation-listener.tsx` | Dashboard-mounted listener; shows toast and navigates on revocation event            |

## Key Patterns

- **Navbar integration** — the navbar reads `activeContext` via selectors and conditionally renders member or shop identity. Shop data is fetched via `useShop(shopId)` when in shop context, with member identity as loading fallback
- **Dashboard-wide consumption** — the active context is read by the dashboard layout and feature components to determine which data source (member vs. shop) to query
- **Logout cleanup** — call `reset()` on logout to clear any shop context and return to the member default. The navbar calls `useContextStore.getState().reset()` before `logout()`
- **Cross-refresh persistence** — localStorage ensures the active context survives page refreshes without requiring a re-selection
- **Hydration safety** — context-dependent rendering in the navbar is guarded behind the `mounted` check (via `useSyncExternalStore`) to prevent SSR/client hydration mismatches
- **Revocation listener placement** — `ContextRevocationListener` is mounted once in the dashboard layout so it is present for the full authenticated session and removed when the user leaves the dashboard
