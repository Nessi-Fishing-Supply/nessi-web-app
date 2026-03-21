# Implementation Plan: #94 — Migrate from Axios to Native Fetch

## Overview
2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Create Fetch Wrapper and Migrate Services
**Goal:** Replace the axios instance and all product service calls with a native fetch wrapper that preserves the X-Nessi-Context header injection pattern
**Verify:** `pnpm build`

### Task 1.1: Create the native fetch wrapper module
Create `src/libs/fetch.ts` with typed helper functions (`get<T>`, `post<T>`, `put<T>`, `del<T>`) that mirror the axios instance pattern. The wrapper must read `useContextStore.getState()` from `@/features/context/stores/context-store` outside React (same as the current axios interceptor) and attach the `X-Nessi-Context` header on every request. For JSON bodies, set `Content-Type: application/json` and `JSON.stringify` the body. For `FormData` bodies, do NOT set `Content-Type` — the browser must set the multipart boundary automatically. All helpers should parse the JSON response and return the typed data directly (not wrapped in a response object), matching how axios returns `res.data`. Non-ok responses should throw an `Error` with the response status and any error message from the JSON body.
**Files:** `src/libs/fetch.ts`
**AC:**
- File exports `get<T>`, `post<T>`, `put<T>`, `del<T>` functions
- Each function attaches `X-Nessi-Context` header using `useContextStore.getState().activeContext`
- Header value is `'member'` when context type is `'member'`, or `'shop:{shopId}'` when context type is `'shop'` (matching the existing axios interceptor logic in `src/libs/axios.ts` lines 7-9)
- JSON bodies are serialized with `Content-Type: application/json`
- FormData bodies are passed through without setting `Content-Type`
- Non-ok responses throw an `Error` with message containing status and server error text
- Return type is `Promise<T>` (parsed JSON data, not the raw Response)
**Expert Domains:** nextjs

### Task 1.2: Rewrite product services to use the fetch wrapper
Replace all 7 axios calls in `src/features/products/services/product.ts` with the corresponding fetch wrapper helpers from `src/libs/fetch.ts`. The import changes from `import axios from 'axios'` to importing `{ get, post, put, del }` from `@/libs/fetch`. Each function's signature, return type, and behavior must remain identical. `uploadProductImage` must pass the `FormData` body to `post` without manually setting Content-Type.
**Files:** `src/features/products/services/product.ts`
**AC:**
- No import of `axios` remains in the file
- All 7 functions (`createProduct`, `getAllProducts`, `getUserProducts`, `getProductById`, `updateProduct`, `deleteProduct`, `uploadProductImage`) use fetch wrapper helpers
- Function signatures and return types are unchanged
- `uploadProductImage` passes `FormData` to `post` (not JSON-serialized)
**Expert Domains:** nextjs

### Task 1.3: Update error handling in add-product-form
Replace the `axios.isAxiosError(error)` check in `src/features/products/components/add-product-form/index.tsx` with a standard `error instanceof Error` check. Remove the `import axios from 'axios'` line. The error logging should use `error.message` instead of `error.response?.data || error.message`.
**Files:** `src/features/products/components/add-product-form/index.tsx`
**AC:**
- No import of `axios` in the file
- Error handling uses `error instanceof Error` instead of `axios.isAxiosError(error)`
- Error message logged via `error.message`
- Component behavior is otherwise unchanged
**Expert Domains:** nextjs

## Phase 2: Remove Axios Dependency and Update Documentation
**Goal:** Delete the axios module, remove the package dependency, and update all documentation references to reflect the new fetch wrapper
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 2.1: Delete axios module and remove the package dependency
Delete `src/libs/axios.ts`. Remove `axios` from `dependencies` in `package.json`. Run `pnpm install` to update the lockfile. Verify with grep that no file in `src/` imports from `axios`.
**Files:** `src/libs/axios.ts` (delete), `package.json`
**AC:**
- `src/libs/axios.ts` does not exist
- `axios` is not listed in `package.json` dependencies
- `pnpm install` succeeds and lockfile is updated
- No file in `src/` contains `import` or `require` of `axios` (verified by grep)
**Expert Domains:** nextjs

### Task 2.2: Update CLAUDE.md files to reference fetch wrapper instead of axios
Update three CLAUDE.md files that reference axios:
1. `src/features/products/CLAUDE.md` line 9 — change "CRUD + image upload via axios" to "CRUD + image upload via fetch wrapper"
2. `src/features/context/CLAUDE.md` line 47 — change the "Axios interceptor" consumer entry to describe the fetch wrapper in `src/libs/fetch.ts` that attaches `X-Nessi-Context` header by reading from `useContextStore.getState()` outside React
3. `src/features/members/CLAUDE.md` line 102 — change "not axios/API routes" to "not API routes" (remove the axios mention since it no longer exists in the project)
**Files:** `src/features/products/CLAUDE.md`, `src/features/context/CLAUDE.md`, `src/features/members/CLAUDE.md`
**AC:**
- No CLAUDE.md file in the repo contains the word "axios"
- `src/features/products/CLAUDE.md` references "fetch wrapper" for product services
- `src/features/context/CLAUDE.md` lists "Fetch wrapper" as a consumer instead of "Axios interceptor", referencing `src/libs/fetch.ts`
- `src/features/members/CLAUDE.md` no longer mentions axios
**Expert Domains:** nextjs
