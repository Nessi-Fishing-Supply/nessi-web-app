# Implementation Plan: #253 — Invite Acceptance API and Page

## Overview

3 phases, 9 total tasks
Estimated scope: medium

This feature adds a `POST /api/invites/[token]/accept` API route for processing shop invite acceptance, and a public `/invite/[token]` page that displays invite details. Authenticated users see an "Accept Invitation" button; unauthenticated users see a sign-in prompt that navigates to `?login=true` to trigger the navbar's login modal. The accept route is intentionally placed outside `/api/shops/[id]/` because the invitee is not yet a shop member and cannot provide `X-Nessi-Context`.

## Phase 1: API Route and Service Layer

**Goal:** Create the accept invite API route with all validation logic, plus the client-side service function and Tanstack Query mutation hook.
**Verify:** `pnpm build`

### Task 1.1: Create POST /api/invites/[token]/accept route

Create the API route that processes invite acceptance. It authenticates via the server Supabase client (`getUser()`), looks up the invite by token via admin client, validates status/expiry, checks the user is not already a shop member, re-checks both the per-shop member cap (`MAX_MEMBERS_PER_SHOP`) and the per-member shop limit (`checkMemberShopLimit`), then inserts a `shop_members` row and updates the invite status to `accepted`.

**Files:** `src/app/api/invites/[token]/accept/route.ts`

**Implementation details:**

- Auth: use `createClient` from `@/libs/supabase/server` to call `getUser()`. Return 401 if no session.
- Invite lookup: use `createAdminClient()` to query `shop_invites` by `token` column (not by `id`). Return 404 if not found.
- Validate invite status is `pending` and `expires_at` is in the future. Return 400 with descriptive error and `code` field (e.g. `INVITE_EXPIRED`, `INVITE_REVOKED`, `INVITE_ALREADY_ACCEPTED`) if not.
- Check user is not already in `shop_members` for this `shop_id`. Return 409 with `code: 'ALREADY_MEMBER'` if so.
- Check per-shop cap: count `shop_members` + pending `shop_invites` for the shop (same pattern as `POST /api/shops/[id]/invites/route.ts` lines 47-78). Return 409 with `code: 'MEMBER_LIMIT_REACHED'` if `>= MAX_MEMBERS_PER_SHOP`.
- Check per-member limit: call `checkMemberShopLimit(user.id)` from `@/features/shops/utils/check-member-shop-limit`. Return 409 with `code: 'SHOP_LIMIT_REACHED'` if not within limit.
- On success: insert `shop_members` row with `{ shop_id, member_id: user.id, role_id: invite.role_id }`, update invite `status` to `'accepted'`. Return `{ success: true, shopId: invite.shop_id, shopName }` (fetch shop name in a parallel query).
- Use `AUTH_CACHE_HEADERS` from `@/libs/api-headers` on all responses.
- Follow the error handling pattern from `src/app/api/shops/[id]/invites/[inviteId]/route.ts`.

**Patterns to follow:**

- `src/app/api/shops/[id]/invites/route.ts` (member cap check pattern, admin client usage)
- `src/app/api/shops/[id]/invites/[inviteId]/route.ts` (invite status validation pattern)

**AC:**

- POST returns 200 with `{ success: true, shopId, shopName }` when token is valid, invite is pending/not expired, user is authenticated, and all caps pass
- `shop_members` row is inserted with the invite's `role_id`
- Invite status is updated to `accepted`
- Returns 401 for unauthenticated requests
- Returns 404 for unknown tokens
- Returns 400 for expired, revoked, or already-accepted invites (with descriptive `code` field)
- Returns 409 for already-a-member, per-shop cap reached, or per-member shop limit reached
  **Expert Domains:** supabase, nextjs

### Task 1.2: Add acceptInvite service function and useAcceptInvite hook

Create a client-side service function that calls the accept API, and a Tanstack Query mutation hook. The service function should NOT use `@/libs/fetch` (which injects `X-Nessi-Context`) because the invitee is not yet a shop member. Use raw `fetch` instead.

**Files:**

- `src/features/shops/services/shop-invites.ts` (add `acceptShopInvite` function)
- `src/features/shops/hooks/use-shop-invites.ts` (add `useAcceptInvite` hook)

**Implementation details:**

- Service function `acceptShopInvite(token: string): Promise<{ success: true; shopId: string; shopName: string }>` — uses raw `fetch('/api/invites/${token}/accept', { method: 'POST' })`. On non-ok response, parse error JSON and throw with the message.
- Hook `useAcceptInvite()` — `useMutation` wrapping `acceptShopInvite`. On success, invalidate `['shops', 'member', userId]` so the user's shop list refreshes. Extract `userId` from the mutation's returned `shopId` context or from `useAuth()`.

**Patterns to follow:**

- `src/features/shops/services/shop-invites.ts` (existing service functions)
- `src/features/shops/hooks/use-shop-invites.ts` (existing mutation hooks)

**AC:**

- `acceptShopInvite(token)` calls the correct endpoint and returns typed response
- `useAcceptInvite` mutation invalidates shop membership queries on success
- Both compile without type errors
  **Expert Domains:** state-management, nextjs

### Task 1.3: Add InviteDetails type for the page data shape

Add a type representing the invite details that the server component will pass to the client component. This keeps the data contract explicit.

**Files:** `src/features/shops/types/invite.ts` (add to existing file)

**Implementation details:**
Add an `InvitePageData` interface:

```typescript
export interface InvitePageData {
  token: string;
  shopName: string;
  shopAvatarUrl: string | null;
  inviterName: string;
  roleName: string;
  expiresAt: string;
  status: 'pending' | 'expired' | 'accepted' | 'revoked';
}
```

**AC:**

- Type is exported and importable from `@/features/shops/types/invite`
- Type does NOT expose the invitee's email (security constraint)
  **Expert Domains:** nextjs

## Phase 2: Page and Client Component

**Goal:** Create the `/invite/[token]` server component page and the `InviteAccept` client component that handles the accept interaction and auth-gated UI.
**Verify:** `pnpm build`

### Task 2.1: Create /invite/[token] server component page

Create the server component that fetches invite details via admin client (the invitee may not be a member yet, so RLS would block them). The page must be publicly accessible (proxy.ts only blocks `/dashboard/*`). Include `generateMetadata` for SEO.

**Files:**

- `src/app/(frontend)/invite/[token]/page.tsx`

**Implementation details:**

- `generateMetadata`: return `{ title: 'Shop Invitation' }` (generic — do not leak shop name in title for privacy, or optionally `Join {shopName} | Nessi`).
- Server component: use `createAdminClient()` to query `shop_invites` by `token`, joining `shops(shop_name, avatar_url)`, `shop_roles(name)`, and `members!shop_invites_invited_by_fkey(first_name, last_name)`.
- If invite not found, call `notFound()`.
- Compute `status` field: if DB status is `pending` but `expires_at < now()`, treat as `'expired'`.
- Build `InvitePageData` object from the query results. Format inviter name as `"FirstName LastName"` or `"A shop member"` if null.
- Also check if the current user is authenticated via server client `getUser()` — pass `isAuthenticated: boolean` and `currentUserEmail: string | null` as props to the client component.
- Render the `InviteAccept` client component with the invite data.

**Patterns to follow:**

- `src/app/(frontend)/listing/[id]/page.tsx` (server component with `generateMetadata`, passing data to client component)
- `src/app/(frontend)/shop/[slug]/page.tsx` (admin client for public data, avatar handling)

**AC:**

- Page is accessible without authentication at `/invite/{token}`
- Shows `notFound()` for invalid tokens
- Passes correctly shaped `InvitePageData` to client component
- `generateMetadata` returns a title
- Does NOT expose invitee email in any rendered output
  **Expert Domains:** supabase, nextjs

### Task 2.2: Create InviteAccept client component

Create the client component that renders invite details and handles the accept interaction. Shows different UI based on auth state and invite status.

**Files:**

- `src/features/shops/components/invite-accept/index.tsx`
- `src/features/shops/components/invite-accept/invite-accept.module.scss`

**Implementation details:**

- Props: `{ invite: InvitePageData; isAuthenticated: boolean }`
- **Valid pending invite + authenticated:** Show shop avatar (via `next/image` with `sizes="80px"` if `shopAvatarUrl` exists, else initial letter fallback), shop name, inviter name, role name, expiry date. Render "Accept Invitation" `Button` from `@/components/controls/button` with `loading` state from the mutation. On success, show success toast via `useToast()` and redirect to `/dashboard` via `useRouter().push()`.
- **Valid pending invite + unauthenticated:** Show same invite details, but instead of accept button, show a message "Sign in to accept this invitation" with a `Button` that navigates to `?login=true` (this triggers the navbar's login modal via the `useEffect` in `src/components/navigation/navbar/index.tsx` lines 144-157). After login, user will be on the same page and can accept.
- **Expired invite:** Show an error card: "This invitation has expired. Please ask the shop owner to send a new invite."
- **Accepted invite:** Show: "This invitation has already been accepted."
- **Revoked invite:** Show: "This invitation has been revoked."
- **API errors on accept:** Render error message in a `role="alert"` `aria-live="assertive"` container. Map error codes to user-friendly messages:
  - `ALREADY_MEMBER` → "You are already a member of this shop."
  - `MEMBER_LIMIT_REACHED` → "This shop has reached its member limit."
  - `SHOP_LIMIT_REACHED` → "You have reached the maximum number of shops you can join."
  - Default → the error message from the API.
- Mobile-first centered card layout. Card should be centered vertically on larger screens.
- 44x44px minimum tap targets on all buttons.
- Use `aria-busy` on the accept button during loading (already handled by `Button` component).

**Reuses:**

- `src/components/controls/button/` (Button with loading state)
- `src/components/indicators/toast/context` (useToast for success feedback)

**Patterns to follow:**

- `src/app/(frontend)/shop/[slug]/page.tsx` (avatar with fallback pattern)
- `src/components/navigation/navbar/index.tsx` lines 144-157 (`?login=true` pattern for triggering auth modal)

**AC:**

- Authenticated users see invite details and "Accept Invitation" button
- Unauthenticated users see invite details and "Sign in to accept" button that triggers login modal
- Expired/accepted/revoked invites show appropriate error messages
- Accept button shows loading state during mutation
- Success triggers toast and redirects to `/dashboard`
- API errors are displayed with `role="alert"` and `aria-live="assertive"`
- Error codes are mapped to user-friendly messages
- All tap targets are at least 44x44px
  **Expert Domains:** nextjs, scss, state-management

### Task 2.3: Style the invite accept component

Create the SCSS module for the invite accept component with mobile-first centered card layout.

**Files:** `src/features/shops/components/invite-accept/invite-accept.module.scss`

**Implementation details:**

- Mobile-first: full-width card with padding on small screens
- Centered card (max-width ~480px) on larger screens with vertical centering
- Use CSS custom property tokens from `src/styles/variables/` (never hardcode hex/px)
- Use `@include breakpoint()` from `src/styles/mixins/breakpoints` for responsive enhancement
- Shop avatar: 80x80 circle with fallback initial letter (similar to shop page pattern)
- Error states: use `var(--color-danger-500)` or similar token for error text
- Sections: invite details (avatar, shop name, inviter, role, expiry), action area (button), error area

**Patterns to follow:**

- `src/app/(frontend)/shop/[slug]/shop-page.module.scss` (avatar container, centered layout, CSS custom properties)
- Mobile-first as documented in `src/styles/CLAUDE.md`

**AC:**

- Card is full-width on mobile, centered with max-width on desktop
- Uses only CSS custom property tokens (no hardcoded values)
- Mobile-first with `@include breakpoint()` for larger screens
- Avatar is 80x80 circle
- Passes `pnpm lint:styles`
  **Expert Domains:** scss

## Phase 3: Polish and Edge Cases

**Goal:** Handle remaining edge cases, ensure the page works end-to-end after login, and update feature documentation.
**Verify:** `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm build`

### Task 3.1: Handle post-login redirect back to invite page

After an unauthenticated user clicks "Sign in to accept" and logs in via the navbar modal, they stay on the current page (`/invite/[token]`). The page needs to react to auth state changes so the UI updates from "Sign in" to "Accept" without a full page reload.

**Files:** `src/features/shops/components/invite-accept/index.tsx` (modify)

**Implementation details:**

- The component already receives `isAuthenticated` from the server component, but after client-side login the auth state changes via `useAuth()`. Use `useAuth()` inside the client component to get live auth state: `const { isAuthenticated: clientAuth, isLoading: authLoading } = useAuth()`. Use `clientAuth` (not the server-passed prop) to determine which UI to show, falling back to the server prop during initial render.
- While `authLoading` is true, show a skeleton/loading state for the action area (not the invite details, which are already server-rendered).
- This ensures that after login via the navbar modal, the component re-renders with the accept button without requiring a page reload.

**AC:**

- After logging in via the navbar modal on the invite page, the UI updates to show "Accept Invitation" without a page reload
- Loading state is shown while auth state is being determined
- No hydration mismatch between server and client renders
  **Expert Domains:** nextjs, state-management

### Task 3.2: Update shops feature CLAUDE.md with invite acceptance documentation

Document the new API route, service function, hook, and page in the shops feature CLAUDE.md.

**Files:** `src/features/shops/CLAUDE.md` (modify)

**Implementation details:**

- Add `POST /api/invites/[token]/accept` to the Invite API section with status codes and behavior
- Add `acceptShopInvite(token)` to the Service Functions table
- Add `useAcceptInvite()` to the Hooks table with query key invalidation
- Add `InviteAccept` to the Components table
- Add `/invite/[token]` to the Pages table
- Add `InvitePageData` to the types description

**AC:**

- All new API routes, services, hooks, components, types, and pages are documented
- Documentation matches the actual implementation
  **Expert Domains:** nextjs

### Task 3.3: Add loading.tsx for the invite route

Add a loading state for the invite page to show during server component data fetching.

**Files:** `src/app/(frontend)/invite/[token]/loading.tsx`

**Implementation details:**

- Simple centered loading skeleton matching the invite card layout (avatar placeholder, text lines, button placeholder)
- Use CSS custom property tokens for colors
- Can be a simple spinner or skeleton — follow patterns from other loading.tsx files in the project

**AC:**

- `loading.tsx` exports a default component
- Shows a centered loading state while the invite page data loads
- Passes `pnpm build`
  **Expert Domains:** nextjs, scss

## Key Implementation Notes

1. **No `X-Nessi-Context` on accept route** — The accept API is at `/api/invites/[token]/accept`, not under `/api/shops/[id]/`. The invitee is not yet a shop member, so `requireShopPermission` and the context header must NOT be used. Auth is purely via `getUser()`.

2. **Admin client for page data** — The server component must use `createAdminClient()` (not the server client) to fetch invite details because the invitee may not have RLS access to `shop_invites`. The admin client bypasses RLS.

3. **Login modal trigger** — Unauthenticated users are redirected to `?login=true` which the navbar detects and opens the login modal (existing pattern at `src/components/navigation/navbar/index.tsx` lines 144-157). After login, `useAuth()` updates and the component re-renders.

4. **Dual cap checks** — The accept route must check BOTH `MAX_MEMBERS_PER_SHOP` (shop-level) AND `checkMemberShopLimit` (member-level, max 5 shops). These are independent constraints.

5. **Expired invite detection** — The DB `status` column may still say `pending` for an expired invite (no cron job updates it). The API route and the page must both compute effective status by checking `expires_at < now()`.

6. **No email exposure** — The public page must NOT display the invitee's email address. Only show shop name, inviter name, role, and expiry.

7. **Raw fetch for accept service** — `src/libs/fetch.ts` injects `X-Nessi-Context` which is not appropriate for the accept endpoint. The `acceptShopInvite` service function should use plain `fetch()`.
