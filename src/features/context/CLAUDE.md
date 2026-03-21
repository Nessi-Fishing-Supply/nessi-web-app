# Context Feature

## Overview

The context feature manages which entity (member or shop) the user is currently acting as in the Nessi dashboard. This is the architectural backbone for context switching — it determines which identity is active and what data the dashboard displays.

## Architecture

- **stores/context-store.ts** — Zustand store with localStorage persistence managing the active context

## ActiveContext Type

Discriminated union representing the two possible active identities:

- `{ type: 'member' }` — user is acting as themselves
- `{ type: 'shop'; shopId: string }` — user is acting as a shop

## Store Shape

**State:**

- `activeContext: ActiveContext` — defaults to `{ type: 'member' }`

**Actions:**

| Action                       | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `switchToMember()`           | Set active context to the member identity        |
| `switchToShop(shopId)`       | Set active context to a specific shop by ID      |
| `reset()`                    | Clear to default member context (used on logout) |

## Persistence

Uses `zustand/middleware` `persist` with localStorage. Storage key: `'nessi-context'`. Defaults to member context when no persisted value exists.

## Access Pattern

The store is wrapped with `createSelectors` from `@/libs/create-selectors`. Access individual slices via auto-generated selectors:

```ts
useContextStore.use.activeContext()
```

## Key Patterns

- **No UI components** — this domain contains only store logic; no React components live here
- **Dashboard-wide consumption** — the active context is read by the dashboard layout and feature components to determine which data source (member vs. shop) to query
- **Logout cleanup** — call `reset()` on logout to clear any shop context and return to the member default
- **Cross-refresh persistence** — localStorage ensures the active context survives page refreshes without requiring a re-selection
