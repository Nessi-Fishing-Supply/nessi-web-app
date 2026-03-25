# Implementation Plan: #166 — Saved Shipping Addresses

## Overview

4 phases, 16 total tasks
Estimated scope: medium

## Phase 1: Database and Infrastructure

**Goal:** Create the `addresses` table with RLS policies, indexes, and a 5-address-per-user constraint, then regenerate TypeScript types.
**Verify:** `pnpm build`

### Task 1.1: Create addresses table migration with RLS policies

Create a new Supabase migration that defines the `addresses` table: `id` (UUID PK), `user_id` (FK to `members.id` with ON DELETE CASCADE), `label` (text, e.g. "Home", "Work"), `line1` (text, required), `line2` (text, nullable), `city` (text, required), `state` (text, 2-char code, required), `zip` (text, required), `is_default` (boolean, default false), `created_at` (timestamptz), `updated_at` (timestamptz). Add a unique constraint on `(user_id, label)` to prevent duplicate labels per user. Add an index on `user_id`. Enable RLS with four policies (SELECT, INSERT, UPDATE, DELETE) all scoped to `user_id = (SELECT auth.uid())`. Add a trigger function `enforce_max_addresses()` that runs BEFORE INSERT and raises an exception if the user already has 5 addresses. Add a trigger function `ensure_single_default()` that runs BEFORE INSERT OR UPDATE: when `is_default = true`, it sets all other addresses for that user to `is_default = false`. Follow the migration pattern established in `20260323000000_create_cart_items.sql` with section comments.
**Files:** `supabase/migrations/20260326000000_create_addresses.sql`
**AC:** Migration SQL is valid. Table has RLS enabled. All four CRUD policies exist scoped to authenticated users accessing only their own rows. Max 5 addresses enforced via trigger. Only one default address per user enforced via trigger. FK cascade to `members.id` exists.
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.2: Regenerate database types

Run `pnpm db:types` to regenerate `src/types/database.ts` with the new `addresses` table types. Verify the generated types include `addresses` with Row, Insert, and Update types.
**Files:** `src/types/database.ts`
**AC:** `Database['public']['Tables']['addresses']` exists with correct Row/Insert/Update types reflecting all columns from the migration.
**Expert Domains:** supabase

## Phase 2: Feature Foundation (Types, Services, Hooks)

**Goal:** Create the `src/features/addresses/` feature directory with types, client/server services, Tanstack Query hooks, and validations following established cart/members patterns.
**Verify:** `pnpm build`

### Task 2.1: Create address types

Define TypeScript types derived from the generated database types. `Address` from Row type. `AddressInsert` omitting `id`, `created_at`, `updated_at`, `user_id` (server sets these). `AddressUpdate` as `Partial<AddressInsert>`. `AddressFormData` for the form: `label`, `line1`, `line2`, `city`, `state`, `zip`, `is_default`. Export `MAX_ADDRESSES = 5`.
**Files:** `src/features/addresses/types/address.ts`
**AC:** All types compile. `Address` matches the database Row type. `AddressFormData` contains all user-editable fields. `MAX_ADDRESSES` constant exported.
**Expert Domains:** supabase

### Task 2.2: Create address validation schema

Create Yup validation schemas following the pattern in `src/features/members/validations/onboarding.ts`. Schema `addressSchema` validates: `label` (required, max 50 chars), `line1` (required, max 100 chars), `line2` (optional, max 100 chars), `city` (required, max 50 chars), `state` (required, must be a valid 2-char US state code from `US_STATES`), `zip` (required, matches US ZIP pattern `/^\d{5}(-\d{4})?$/`), `is_default` (boolean, optional).
**Files:** `src/features/addresses/validations/address.ts`
**AC:** Schema rejects empty required fields, invalid state codes, and malformed ZIP codes. Accepts valid full addresses with or without line2.

### Task 2.3: Create server-side address service

Create server service using `@/libs/supabase/server` following the pattern in `src/features/cart/services/cart-server.ts`. Functions: `getAddressesServer(userId)` returns all addresses ordered by `is_default DESC, created_at DESC`. `getAddressServer(userId, addressId)` returns single address or throws. `createAddressServer(userId, data)` inserts and returns the new address (enforces 5-address cap with a count check before insert for a better error message than the DB trigger). `updateAddressServer(userId, addressId, data)` updates and returns. `deleteAddressServer(userId, addressId)` deletes; if the deleted address was default, promotes the most recently created remaining address to default. `getDefaultAddressServer(userId)` returns the default address or null.
**Files:** `src/features/addresses/services/address-server.ts`
**AC:** All functions use server Supabase client. RLS ensures user scoping. 5-address cap checked before insert with descriptive error. Delete promotes next address to default when default is deleted.
**Expert Domains:** supabase

### Task 2.4: Create client-side address service

Create client service using `@/libs/fetch` helpers (`get`, `post`, `put`, `del`) following the pattern in `src/features/cart/services/cart.ts`. Functions: `getAddresses()`, `createAddress(data)`, `updateAddress(addressId, data)`, `deleteAddress(addressId)`, `setDefaultAddress(addressId)`. All call `/api/addresses/*` routes.
**Files:** `src/features/addresses/services/address.ts`
**AC:** All functions use the `@/libs/fetch` helpers. Return types match the address types. Base URL is `/api/addresses`.

### Task 2.5: Create Tanstack Query hooks

Create hooks following the pattern in `src/features/cart/hooks/use-cart.ts`. `useAddresses()` query with key `['addresses', userId]`. `useCreateAddress()` mutation that invalidates addresses. `useUpdateAddress()` mutation that invalidates addresses. `useDeleteAddress()` mutation with optimistic removal from cache (filter by ID) and rollback on error. `useSetDefaultAddress()` mutation that optimistically updates `is_default` flags in cache.
**Files:** `src/features/addresses/hooks/use-addresses.ts`
**AC:** All hooks use `useAuth()` for user scoping. Query key follows `['addresses', userId]` convention. Mutations invalidate `['addresses', userId]` on settled. Delete and set-default use optimistic updates with rollback.
**Expert Domains:** state-management

### Task 2.6: Create feature CLAUDE.md

Document the addresses feature architecture, database schema, service functions, hooks, validation rules, and key patterns following the format of `src/features/cart/CLAUDE.md`.
**Files:** `src/features/addresses/CLAUDE.md`
**AC:** Documents all types, services, hooks, validation rules, and the 5-address limit. References the database table schema and RLS policies.

## Phase 3: API Routes

**Goal:** Create CRUD API routes for addresses at `/api/addresses/` following the established cart API route patterns.
**Verify:** `pnpm build`

### Task 3.1: Create GET and POST route for addresses collection

Create the main route handler. GET returns all addresses for the authenticated user. POST creates a new address (validates request body against the Yup schema, enforces 5-address cap). Both use `createClient` from `@/libs/supabase/server` for auth, return 401 for unauthenticated requests, and include `AUTH_CACHE_HEADERS`. Follow the error handling pattern from `src/app/api/cart/route.ts`.
**Files:** `src/app/api/addresses/route.ts`
**AC:** GET returns `Address[]` for authenticated user, 401 for unauthenticated. POST validates body, returns 400 for invalid data, 422 when at 5-address cap, 201 with created address on success. Both include `AUTH_CACHE_HEADERS`.
**Expert Domains:** nextjs, supabase

### Task 3.2: Create PUT and DELETE route for individual address

Create dynamic route handler for `/api/addresses/[id]`. PUT updates an address (validates body, ensures address belongs to user). DELETE removes an address (promotes next to default if deleted address was default). Both return 404 if address not found or doesn't belong to user. Follow patterns from `src/app/api/cart/[id]/route.ts` if it exists, otherwise follow the main cart route patterns.
**Files:** `src/app/api/addresses/[id]/route.ts`
**AC:** PUT validates body, returns updated address or 400/404. DELETE returns `{ success: true }` or 404. Both require authentication (401 if not). Address ownership enforced via server service (RLS backup).
**Expert Domains:** nextjs, supabase

### Task 3.3: Create set-default route

Create a PATCH route at `/api/addresses/[id]/default` that sets the specified address as the user's default. Uses `updateAddressServer` to set `is_default: true` (the DB trigger handles unsetting the previous default).
**Files:** `src/app/api/addresses/[id]/default/route.ts`
**AC:** PATCH returns updated address with `is_default: true`. Returns 404 if address not found. Returns 401 if unauthenticated.
**Expert Domains:** nextjs, supabase

## Phase 4: UI Components — Account Settings Address Management

**Goal:** Build the address management section for the account settings page, including an address list, address form modal, and integration into the existing account page layout.
**Verify:** `pnpm build`

### Task 4.1: Create address card component

Create a card component that displays a single saved address with label, formatted address lines, default badge, and action buttons (edit, delete, set as default). Follow the pattern of account section components in `src/features/members/components/account/`. Include a confirmation step for delete (inline "Are you sure?" with cancel/confirm).
**Files:** `src/features/addresses/components/address-card/index.tsx`, `src/features/addresses/components/address-card/address-card.module.scss`
**AC:** Displays label, full address, and default indicator. Edit button triggers `onEdit` callback. Delete shows inline confirmation. Set-as-default button hidden when already default. All buttons have `aria-label` attributes. 44x44px minimum tap targets on mobile.
**Reuses:** `src/components/controls/button/`, `src/components/indicators/pill/` (if exists, otherwise use a styled span for default badge)
**Expert Domains:** scss

### Task 4.2: Create address form modal component

Create a form component rendered inside a Modal for creating and editing addresses. Uses `react-hook-form` with the Yup validation schema via `@hookform/resolvers/yup`. Form fields: label (input), line1 (input), line2 (input), city (input), state (select using `US_STATES` from members onboarding types), ZIP (input with pattern), is_default (checkbox). Pre-populates fields when editing. Submit calls `useCreateAddress` or `useUpdateAddress` based on mode. Shows toast on success/error.
**Files:** `src/features/addresses/components/address-form-modal/index.tsx`, `src/features/addresses/components/address-form-modal/address-form-modal.module.scss`
**AC:** Form validates all fields on submit. State dropdown uses US_STATES options. ZIP field validates format. Creates new address or updates existing based on whether `address` prop is provided. Shows loading state on submit button. Closes modal and shows success toast on save. Shows error toast on failure. All inputs have labels, `aria-required`, and `aria-invalid` on error.
**Reuses:** `src/components/controls/input/`, `src/components/controls/select/`, `src/components/controls/checkbox/`, `src/components/controls/button/`, `src/components/layout/modal/`
**Expert Domains:** scss

### Task 4.3: Create address list section component

Create the main address management section component that renders the list of saved addresses with an "Add address" button. Shows empty state when no addresses exist. Displays count indicator ("2 of 5 addresses"). Disables "Add address" button when at 5-address cap. Manages modal open/close state for add/edit. Passes edit/delete/set-default handlers to address cards.
**Files:** `src/features/addresses/components/address-list/index.tsx`, `src/features/addresses/components/address-list/address-list.module.scss`
**AC:** Lists all addresses with address-card components. "Add address" button opens the form modal in create mode. Edit button on a card opens form modal in edit mode pre-populated. Delete removes address with optimistic update. Set-as-default updates default flag. Shows "No saved addresses" empty state. Shows "X of 5" count. "Add address" disabled at cap with tooltip/text explaining limit.
**Reuses:** `src/components/controls/button/`
**Expert Domains:** scss, state-management

### Task 4.4: Integrate address list into account settings page

Add the AddressList section component to the account settings page (`/dashboard/account`). Place it as a new section in the main content area between the existing sections (after Notifications, before Seller Settings). Import and render the component with appropriate section wrapper matching existing `sectionItem` div pattern.
**Files:** `src/app/(frontend)/dashboard/account/page.tsx`
**AC:** Address management section appears on the account page between Notifications and Seller Settings. Only renders when user is authenticated. Matches the visual pattern of other account sections (wrapped in `sectionItem` div).
**Expert Domains:** nextjs
