# Implementation Plan: #72 — Context Switching Architecture and Navbar Shop Switcher

## Overview
3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Foundation -- Axios Context Header and Dropdown Divider
**Goal:** Create the configured axios instance with `X-Nessi-Context` header interceptor and add a `DropdownDivider` sub-component to the existing Dropdown for visual separation of switch items.
**Verify:** `pnpm build`

### Task 1.1: Create configured axios instance with X-Nessi-Context request interceptor
Create a centralized axios instance at `src/libs/axios.ts` that reads the active context from the Zustand store and attaches the `X-Nessi-Context` header on every request. The header value should be `member` when `activeContext.type === 'member'` or `shop:{shopId}` when `activeContext.type === 'shop'`. This instance replaces bare `axios` imports elsewhere but migrating existing consumers is not in scope for this ticket.
**Files:** `src/libs/axios.ts`
**AC:** Importing and calling `axiosInstance.get('/api/foo')` attaches the correct `X-Nessi-Context` header based on the current context store value. The interceptor reads directly from `useContextStore.getState()` (Zustand stores are accessible outside React).
**Expert Domains:** state-management

### Task 1.2: Add DropdownDivider sub-component to existing Dropdown
The design spec shows a visual divider separating the "Switch to" section from the main menu items. The existing Dropdown component (`src/components/controls/dropdown/`) has `DropdownItem` and `DropdownTitle` but no divider. Add a `DropdownDivider` component that renders an `<li role="separator">` with a horizontal line style. Export it from the controls barrel file.
**Files:** `src/components/controls/dropdown/index.tsx`, `src/components/controls/dropdown/dropdown.module.scss`, `src/components/controls/index.ts`
**AC:** `<DropdownDivider />` renders inside a Dropdown as a visible horizontal rule with `role="separator"`. It is exported from `@/components/controls`. The existing `DropdownTitle` border-top style can serve as the visual reference.
**Expert Domains:** scss

### Task 1.3: Update Dropdown to accept DropdownDivider as a valid child type
The Dropdown component's `Children.map` logic currently only recognizes `DropdownItem` and `DropdownTitle` as valid child types -- anything else gets wrapped in a `DropdownItem`. Update the type check to also pass through `DropdownDivider` without wrapping.
**Files:** `src/components/controls/dropdown/index.tsx`
**AC:** A `<DropdownDivider />` placed between `DropdownItem` elements renders as a separator without being wrapped in an extra `DropdownItem`. The divider is not focusable via keyboard arrow navigation (it has no `role="menuitem"`).

## Phase 2: Core -- Navbar Context Switching Integration
**Goal:** Wire the context store and shop data into the navbar so the dropdown shows the active identity, lists switchable contexts, and updates on click.
**Verify:** `pnpm build`

### Task 2.1: Add context-aware identity display to navbar trigger
Update the navbar to import `useContextStore` and conditionally display either the member's avatar/name or the active shop's avatar/name in the dropdown trigger. When `activeContext.type === 'shop'`, use `useShop(shopId)` to fetch the shop data and display the shop's `avatar_url` and `shop_name`. When `activeContext.type === 'member'`, keep the existing member identity display.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** When the context store has `{ type: 'shop', shopId: '...' }`, the navbar trigger shows the shop's avatar and the dropdown header shows the shop name. When context is `{ type: 'member' }`, the navbar shows the member's avatar and name as before.
**Expert Domains:** state-management, nextjs

### Task 2.2: Fetch member's shops and render switch items in dropdown
Import `useShopsByMember` in the navbar to fetch all shops the authenticated user belongs to. When in member context and the member has shops, render a `DropdownDivider` followed by a `DropdownTitle` ("Switch to") and a `DropdownItem` for each shop showing the shop name. When in shop context, render a `DropdownDivider` followed by a "Switch to: Member Account" item, plus items for any other shops (excluding the currently active shop).
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** (1) Members with no shops see no switch section. (2) Members with 1+ shops in member context see "Switch to" title with each shop listed. (3) In shop context, dropdown shows "Switch to: Member Account" and any other shops. (4) Switch items use an appropriate icon from react-icons.
**Expert Domains:** state-management, nextjs

### Task 2.3: Wire click handlers to context store actions
Add `onClick` handlers to each switch dropdown item that call `useContextStore`'s `switchToShop(shopId)` or `switchToMember()`. The dropdown should close after switching. No page navigation is needed.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** (1) Clicking "Switch to: {shop_name}" calls `switchToShop(shopId)` and the navbar re-renders with the shop identity. (2) Clicking "Switch to: Member Account" calls `switchToMember()` and the navbar re-renders with the member identity. (3) Context survives page refresh.
**Expert Domains:** state-management

### Task 2.4: Add navbar styles for context switch section
Add SCSS styles for the switch section items in the navbar dropdown. Switch items should be visually distinct from navigation links. Include a small avatar/icon inline with the shop name. Ensure the divider has appropriate spacing. Follow mobile-first principles.
**Files:** `src/components/navigation/navbar/navbar.module.scss`
**AC:** Switch items are visually distinguishable from navigation links. Shop avatars/initials in the switch items are sized smaller than the trigger avatar (e.g., 24x24). Styles follow mobile-first principles.
**Expert Domains:** scss

## Phase 3: Polish -- Logout Reset and Edge Cases
**Goal:** Ensure context resets on logout and handle edge cases like hydration mismatches and loading states.
**Verify:** `pnpm build`

### Task 3.1: Reset context store on logout
Update the `handleLogout` function in the navbar to call `useContextStore.getState().reset()` before calling `logout()`. This ensures the context reverts to member before the auth session is destroyed.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** After logging out and logging back in, the context is always `{ type: 'member' }`. The `nessi-context` localStorage key is cleared or reset.
**Expert Domains:** state-management

### Task 3.2: Handle hydration and loading edge cases
Guard context-dependent rendering behind the existing `mounted` check. Handle loading states for `useShopsByMember` and `useShop` -- show member identity as safe fallback while loading.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** (1) No React hydration mismatch warnings. (2) While shops are loading, no switch section appears. (3) While shop data is loading for a shop context, the navbar shows member identity until data arrives. (4) `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm build` all pass.
**Expert Domains:** nextjs, state-management
