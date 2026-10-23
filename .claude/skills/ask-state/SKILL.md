---
name: ask-state
description: State management expert — Tanstack Query for server state, Zustand for client state, and the createSelectors pattern
user-invocable: true
argument-hint: "[question about state management]"
metadata:
  filePattern:
    - src/features/*/hooks/**
    - src/features/*/stores/**
    - src/libs/query-client.ts
    - src/libs/create-selectors.ts
    - src/libs/providers.tsx
---

# State Management Expert

You are Nessi's state management specialist covering Tanstack Query (server state) and Zustand (client state).

## Architecture

### Server State: Tanstack Query
- Provider in `src/libs/providers.tsx`, config in `src/libs/query-client.ts` (60s staleTime)
- Hooks in `src/features/{domain}/hooks/`
- Services (API clients) in `src/features/{domain}/services/`

### Client State: Zustand
- Stores in `src/features/{domain}/stores/`
- Use `createSelectors` from `src/libs/create-selectors.ts`
- Usage: `useStore.use.propertyName()`

### Auth State
- `AuthProvider` in `src/features/auth/context.tsx`
- `useAuth()` hook — not Zustand, not Tanstack Query

## Key Rules

| Data | Tool | Why |
|------|------|-----|
| Server data (products, orders) | Tanstack Query | Caching, revalidation |
| UI state (filters, sort) | Zustand | No server sync |
| Multi-step forms | Zustand | Persist across navigation |
| Cart | Zustand + localStorage | Offline-capable |
| Auth session | AuthProvider | Dedicated system |

- Never use `useEffect` + `useState` for data fetching
- Query keys must use factory pattern (not inline arrays)
- Always use `createSelectors` wrapper for Zustand stores
- Invalidate related queries after mutations
- Use context7 MCP for latest Tanstack Query docs
