# Implementation Plan: #242 — Add role assignment dropdown to shop members section

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: API Route and Service Layer

**Goal:** Create the PATCH endpoint for updating a member's role and wire up the client-side service function and mutation hook.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 1.1: Create PATCH API route for member role update

Create the API route at `src/app/api/shops/[id]/members/[memberId]/role/route.ts`. The PATCH handler accepts `{ roleId: string }`, validates the target role exists and belongs to the shop (or is a system role), rejects assigning the Owner system role, rejects changing the Owner member's role, and updates `shop_members.role_id`. Use `requireShopPermission(request, 'members', 'full', { expectedShopId })` for authorization — only Owners will pass this check since Manager has `none` on `members`. Use `createAdminClient()` for the database mutations, matching the pattern in `src/app/api/shops/[id]/members/[memberId]/route.ts`. Return `{ success: true, roleName: string }` on success so the client can use the role name in the toast message.
**Files:** `src/app/api/shops/[id]/members/[memberId]/role/route.ts`
**AC:**

- PATCH returns 200 with `{ success: true, roleName }` for valid role assignment by Owner
- Returns 401 for unauthenticated requests
- Returns 403 for non-Owner callers (Manager, Contributor)
- Returns 400 when `roleId` is missing from body
- Returns 400 when attempting to assign Owner system role (`SYSTEM_ROLE_IDS.OWNER`)
- Returns 400 when target member has Owner role (cannot change Owner's role)
- Returns 400 when `roleId` does not exist in `shop_roles` or does not belong to the shop (and is not a system role)
- Uses `AUTH_CACHE_HEADERS` on all responses

**Expert Domains:** supabase, nextjs

### Task 1.2: Add updateMemberRole service function

Add `updateMemberRole(shopId: string, memberId: string, roleId: string)` to `src/features/shops/services/shop.ts`. This function calls `PATCH /api/shops/{shopId}/members/${memberId}/role` with body `{ roleId }` using the `patch` helper from `@/libs/fetch` (which auto-attaches the `X-Nessi-Context` header from the Zustand context store). Return the parsed response including `roleName`.
**Files:** `src/features/shops/services/shop.ts`
**AC:**

- Function exported and callable
- Uses `patch` from `@/libs/fetch` (not raw `fetch`)
- Returns `{ success: boolean; roleName: string }`

**Expert Domains:** nextjs

### Task 1.3: Add useUpdateMemberRole mutation hook

Add `useUpdateMemberRole()` to `src/features/shops/hooks/use-shops.ts`. This `useMutation` hook calls `updateMemberRole` and invalidates `['shops', shopId, 'members']` on success, matching the pattern used by `useRemoveShopMember` and `useAddShopMember`. Import `updateMemberRole` from the service layer.
**Files:** `src/features/shops/hooks/use-shops.ts`
**AC:**

- Hook exported and follows existing mutation hook patterns (queryClient invalidation on success)
- Accepts `{ shopId: string; memberId: string; roleId: string }`
- Invalidates `['shops', variables.shopId, 'members']` on success

**Expert Domains:** state-management

## Phase 2: Role Dropdown UI in ShopMembersSection

**Goal:** Add a role assignment dropdown to each non-owner member row, visible only to the shop Owner, with optimistic updates and toast feedback.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles`

### Task 2.1: Create RoleSelect standalone component

Create a standalone `<select>`-based component at `src/features/shops/components/role-select/index.tsx` with its own SCSS module. This component does NOT use `react-hook-form` (the existing `Select` in `src/components/controls/select/` is form-bound via `Controller` and cannot be used standalone). The component accepts `roles: ShopRole[]`, `currentRoleId: string`, `onChange: (roleId: string) => void`, `disabled: boolean`, `ariaLabel: string`, and `loading: boolean`. It renders a native `<select>` element with the Owner role filtered out. When `loading` is true, it shows a spinner indicator and disables the select. Style mobile-first: full width on mobile, inline on desktop. Ensure the 44x44px minimum tap target per WCAG requirements.
**Files:** `src/features/shops/components/role-select/index.tsx`, `src/features/shops/components/role-select/role-select.module.scss`
**AC:**

- Renders a native `<select>` with all roles except Owner
- Supports `disabled` and `loading` states (select is disabled when either is true)
- Has `aria-label` prop passed through to the `<select>` element
- 44x44px minimum tap target on mobile
- Mobile-first SCSS using project design tokens (no hardcoded hex/px values)

**Expert Domains:** scss, nextjs

### Task 2.2: Integrate RoleSelect into ShopMembersSection with optimistic updates

Update `src/features/shops/components/shop-settings/shop-members-section/index.tsx` to:

1. Import and call `useShopRoles(shop.id)` to fetch available roles
2. Import and call `useUpdateMemberRole()` for the mutation
3. Add `RoleSelect` to the `MemberRow` component, visible only when the current user `isOwner` and the member is NOT the Owner role
4. Implement optimistic update: on role change, immediately update the member's `role_id` in the query cache via `queryClient.setQueryData(['shops', shopId, 'members'], ...)` and roll back on error
5. Show success toast: `"Role updated to {roleName}"` and error toast: `"Failed to update role"` using the existing `useToast` hook
6. Replace the hardcoded `ROLE_LABELS` map with role name lookups from the `useShopRoles` data, falling back to `'Member'` for unknown/deleted roles (graceful fallback for deleted custom roles)
7. Pass the member's display name to `ariaLabel` on RoleSelect: `"Change role for {member name}"`

The `MemberRow` component will need additional props: `roles`, `onRoleChange`, `isRolePending`, and `pendingRoleForMember`. Track which member's role is being updated to disable only that specific dropdown during mutation.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/index.tsx`
**AC:**

- Owner sees RoleSelect next to each non-owner member
- Manager and Contributor do not see RoleSelect (they are not `isOwner`)
- Selecting a role triggers PATCH call via `useUpdateMemberRole`
- Optimistic update: member's role badge changes immediately in the UI
- Rollback: on error, role badge reverts to previous value
- Success toast displays "Role updated to {roleName}"
- Error toast displays "Failed to update role"
- RoleSelect is disabled with loading state during pending mutation
- Existing remove-member functionality is preserved unchanged
- `aria-label` includes the member's name

**Expert Domains:** state-management, nextjs

### Task 2.3: Update ShopMembersSection SCSS for role select layout

Update `src/features/shops/components/shop-settings/shop-members-section/shop-members-section.module.scss` to accommodate the new role select dropdown alongside the existing remove button. On mobile, the role select and remove button stack below the member info. On desktop (sm+ breakpoint), they appear inline in a row with the member info. Add a `.memberActions` wrapper class for the select + button group. Ensure the role badge (static display for Owner row) and role select (interactive for non-owner rows) are visually consistent.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/shop-members-section.module.scss`
**AC:**

- Mobile: role select appears below member info, full width
- Desktop (sm+): role select appears inline next to remove button
- Role badge for Owner row remains unchanged visually
- No hardcoded hex/px values — uses project design tokens
- Passes `pnpm lint:styles`

**Expert Domains:** scss

## Phase 3: Edge Cases and Polish

**Goal:** Handle deleted role fallback behavior and update the feature documentation.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm format:check`

### Task 3.1: Handle deleted role fallback in role display

Update the role label resolution in `ShopMembersSection` to handle the case where a member's `role_id` references a deleted custom role. When the member's `role_id` is not found in the roles list from `useShopRoles`, display "Contributor" as the label (matching `DEFAULT_ROLE_ID` behavior). The `RoleSelect` should also default its value to `SYSTEM_ROLE_IDS.CONTRIBUTOR` when the current `role_id` is not in the available roles list. This ensures graceful degradation without requiring a database migration or trigger.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/index.tsx`, `src/features/shops/components/role-select/index.tsx`
**AC:**

- When a member's `role_id` is not found in the roles list, the role badge displays "Contributor"
- When a member's `role_id` is not found in the roles list, the RoleSelect defaults to Contributor value
- No runtime errors when `role_id` references a nonexistent role

**Expert Domains:** nextjs

### Task 3.2: Update shops feature CLAUDE.md documentation

Update `src/features/shops/CLAUDE.md` to document: the new `updateMemberRole` service function, the `useUpdateMemberRole` hook (mutation key pattern, optimistic update behavior), the new `RoleSelect` component, and the new PATCH API route at `/api/shops/[id]/members/[memberId]/role`. Add the route to the existing API documentation table.
**Files:** `src/features/shops/CLAUDE.md`
**AC:**

- `updateMemberRole` added to service functions table
- `useUpdateMemberRole` added to hooks table with query key pattern
- `RoleSelect` added to components table
- PATCH `/api/shops/[id]/members/[memberId]/role` documented with authorization requirements
- Deleted role fallback behavior documented in Key Patterns section

**Expert Domains:** nextjs
