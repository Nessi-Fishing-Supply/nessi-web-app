# Learnings — #98 Wire shop deletion UI to new API route

## Phase 1

- The `deleteShop` return type change from `Shop` to `void` was fully transparent — neither the `useDeleteShop` hook nor `ShopDeletionSection` used the return value, so no downstream changes were needed.
- Pattern: when switching a service function from direct Supabase to API route, check whether callers use the return value. If not, changing return type to `void` is safe without touching consumers.
