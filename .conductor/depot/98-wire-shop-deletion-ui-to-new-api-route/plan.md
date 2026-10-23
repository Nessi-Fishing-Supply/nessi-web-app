# Implementation Plan: #98 — Wire shop deletion UI to new API route

## Overview

1 phase, 3 total tasks
Estimated scope: small

## Phase 1: Switch deleteShop to fetch-based API call

**Goal:** Replace the client-side Supabase `deleteShop()` with a `fetch` call to `DELETE /api/shops/{id}` and update the hook/component as needed.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 1.1: Rewrite deleteShop service function to call DELETE /api/shops/{id}

Replace the current `deleteShop(id)` in `src/features/shops/services/shop.ts` which does a direct Supabase `update({ deleted_at })` with a `fetch('DELETE', '/api/shops/${id}')` call. Follow the pattern established by `register()` in `src/features/auth/services/auth.ts` — call `fetch`, parse the JSON response, throw on non-ok status using the error message from the response body. The function currently returns `Promise<Shop>` but the API route returns `{ success: true }` on 200 and `{ error: string }` on failure (401/403/404/500). Change the return type to `Promise<void>` since the caller (`ShopDeletionSection`) does not use the returned shop object. Remove the `createClient` import if `deleteShop` was the last function using it (it is not — other functions still use it, so keep the import).
**Files:** `src/features/shops/services/shop.ts`
**AC:** `deleteShop(id)` sends `DELETE /api/shops/${id}` via fetch; throws descriptive errors for 401/403/404/500 responses; returns `Promise<void>` on success; no Supabase browser client usage in this function.
**Expert Domains:** nextjs

### Task 1.2: Update useDeleteShop hook for new return type

The `useDeleteShop` hook in `src/features/shops/hooks/use-shops.ts` currently has `mutationFn: (id: string) => deleteShop(id)` which returned `Shop`. Since `deleteShop` now returns `void`, the mutation's generic type changes from `Shop` to `void`. The `onSuccess` callback only calls `queryClient.invalidateQueries({ queryKey: ['shops'] })` which does not use the return value, so no logic changes are needed — only the implicit TypeScript generic updates. Verify the `ShopDeletionSection` component at `src/features/shops/components/shop-settings/shop-deletion-section/index.tsx` still works: it calls `deleteShopMutation.mutateAsync(shop.id)` and does not use the resolved value, so no changes are needed there.
**Files:** `src/features/shops/hooks/use-shops.ts`, `src/features/shops/components/shop-settings/shop-deletion-section/index.tsx` (verify only, likely no changes)
**AC:** `useDeleteShop` hook compiles with `deleteShop` returning `Promise<void>`; `ShopDeletionSection` still calls `mutateAsync(shop.id)` and handles success/error correctly; `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 1.3: Update shops feature CLAUDE.md documentation

Update `src/features/shops/CLAUDE.md` to reflect that `deleteShop()` now calls the API route instead of the browser Supabase client. In the Service Functions table, change the `deleteShop(id)` description from "Soft delete via `deleted_at = now()`, returns updated `Shop`" to "Calls `DELETE /api/shops/{id}` for server-side deletion with storage cleanup, returns `void`". In the Key Patterns section, remove or update the note about "Direct Supabase access" to clarify that `deleteShop` is an exception that uses the API route (matching the avatar upload pattern). The existing "Server-side deletion with storage cleanup" paragraph already describes the API route — remove the sentence about "The client-side `deleteShop()` service function remains for backward compatibility but does not clean up storage" since this is no longer true.
**Files:** `src/features/shops/CLAUDE.md`
**AC:** CLAUDE.md accurately describes `deleteShop()` as calling the API route; no references to backward-compatible client-side deletion remain; service function table shows correct return type (`void`).
