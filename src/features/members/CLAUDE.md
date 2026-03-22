# Members Feature

## Overview

Member profile management for Nessi's C2C marketplace users. Handles member data fetching, updates, slug generation, onboarding status, and a branching onboarding wizard (3 steps for buyers, 5 steps for sellers) that runs on first login. Members are identified by `first_name + last_name`.

## Architecture

- **types/member.ts** — Database-derived types: `Member` (from members Row), `MemberUpdateInput` (Update minus 11 system-managed fields), `OnboardingStatus`
- **types/onboarding.ts** — Onboarding form types (`OnboardingStep1Data`, `OnboardingIntentData`, `OnboardingFishingData`, `OnboardingSellerTypeData`, `OnboardingBioData`, `OnboardingFormData`), union types (`OnboardingIntent`, `OnboardingSellerType`), and option constants (`SPECIES_OPTIONS`, `TECHNIQUE_OPTIONS`, `US_STATES`)
- **types/seller.ts** — Seller precondition types: `SellerPreconditions` (canDisable, activeListingsCount, activeOrdersCount)
- **services/member.ts** — Direct Supabase queries via browser client (RLS handles authorization, no API routes needed)
- **services/member-server.ts** — Server-side Supabase queries via server client (for server components, e.g., public profile page)
- **validations/onboarding.ts** — Yup schemas for each wizard step (`step1Schema`, `intentSchema`, `fishingSchema`, `sellerTypeSchema`, `bioSchema`)
- **stores/onboarding-store.ts** — Zustand store managing wizard step state and collected form data
- **hooks/use-member.ts** — Tanstack Query hooks for data fetching and mutations

## Service Functions

| Function                     | Purpose                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getMember(userId)`          | Fetch member by user ID, returns `Member \| null`                                                                                                 |
| `getMemberBySlug(slug)`      | Fetch member by URL slug (excludes soft-deleted), returns `Member \| null`                                                                        |
| `updateMember(userId, data)` | Update allowed member fields, returns updated `Member`                                                                                            |
| `checkSlugAvailable(slug)`   | Slug uniqueness check via `check_slug_available` RPC against `slugs` table, returns `boolean`                                                     |
| `generateSlug(name)`         | Convert name to URL-safe slug (pure function, no DB call)                                                                                         |
| `completeOnboarding(userId)` | Sets `onboarding_completed_at` to now via `updateMember`, returns `Member`                                                                        |
| `getSellerPreconditions()`   | Fetch seller precondition data via `/api/members/seller-preconditions`, returns `SellerPreconditions`                                             |
| `toggleSeller(isSeller)`     | Toggle seller status via `/api/members/toggle-seller`. When disabling, hides all member products (`is_visible = false`). Returns updated `Member` |

### Server-side Service Functions (`services/member-server.ts`)

| Function                      | Purpose                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `getMemberBySlugServer(slug)` | Server-side fetch member by slug (for server components), returns `Member \| null` |

## Hooks

| Hook                               | Query Key                                                                   | Purpose                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `useMember(userId, enabled?)`      | `['members', userId]`                                                       | Fetch member by user ID                                                                            |
| `useMemberBySlug(slug, enabled?)`  | `['members', 'slug', slug]`                                                 | Fetch member by slug                                                                               |
| `useUpdateMember()`                | mutation, invalidates `['members']`                                         | Update member fields                                                                               |
| `useCompleteOnboarding()`          | mutation, invalidates `['members']`                                         | Mark onboarding complete by setting `onboarding_completed_at`                                      |
| `useSlugCheck(slug, enabled?)`     | `['slugs', 'check', slug]`                                                  | Slug availability check via slugs table RPC (enabled when slug >= 2 chars, 30s stale time)         |
| `useSellerPreconditions(enabled?)` | `['members', 'seller-preconditions']`                                       | Fetch seller precondition data (active listings/orders count). Only enabled when `enabled` is true |
| `useToggleSeller()`                | mutation, invalidates `['members']` + `['members', 'seller-preconditions']` | Toggle seller status with product visibility side effect                                           |

## Utilities

| Function                                 | File                   | Purpose                                    |
| ---------------------------------------- | ---------------------- | ------------------------------------------ |
| `formatMemberName(firstName, lastName)`  | `utils/format-name.ts` | Returns `"firstName lastName"` for display |
| `getMemberInitials(firstName, lastName)` | `utils/format-name.ts` | Returns uppercase initials (e.g. "KH")     |

## Onboarding Components

The wizard lives under `components/onboarding/` and supports a branching flow:

- **Buyer path (4 visual steps):** Display Name → Intent → Fishing Identity → Bio
- **Seller path (5 visual steps):** Display Name → Intent → Fishing Identity → Seller Type → Bio

Internal step numbering is 1-5; the buyer path skips step 4 (seller type). The progress indicator maps internal steps to visual positions.

| Component                | Purpose                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `onboarding-wizard/`     | Main container — reads auth state, guards against unauthenticated access, routes between steps with branching logic        |
| `step-display-name/`     | Step 1 — avatar upload only (no name input, name comes from registration)                                                  |
| `step-intent/`           | Step 2 — "How do you plan to use Nessi?" with buyer/seller selection cards (`role="radiogroup"`)                           |
| `step-fishing-identity/` | Step 3 — species and technique `PillSelector` multi-selects + home state dropdown (all optional)                           |
| `step-seller-type/`      | Step 4 (seller path only) — "How do you want to sell?" with free/shop selection cards. Shop has "set up after" note        |
| `step-bio/`              | Step 5 — bio textarea (280 char max), conditionally sets `is_seller = true` for seller+free path, calls completeOnboarding |
| `progress-indicator/`    | Dynamic circle progress bar (4 or 5 circles based on intent), highlights current step                                      |

### AvatarUpload (`components/avatar-upload/`)

Reusable avatar component used in Step 1. Accepts a `name` prop (not `displayName`). Shows camera icon placeholder when no image is set. On file pick it POSTs to `/api/members/avatar` and calls `onUpload(url)` with the returned public URL.

## Avatar Upload API

`POST /api/members/avatar` — server-side avatar upload route.

- Requires an authenticated session (401 if not logged in)
- Accepts `multipart/form-data` with a `file` field (JPEG, PNG, WebP, or GIF, max 5 MB)
- Uses `sharp` to resize to 200x200 cover crop and re-encodes as WebP at 80% quality
- Stores under `avatars/{userId}.webp` in the `avatars` Supabase Storage bucket with `upsert: true`
- Returns `{ url: string }` — the public URL of the uploaded avatar

## Account Components

The account page (`/dashboard/account`) displays and edits member data via collapsible card sections. Components live under `components/account/`.

| Component           | Purpose                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personal-info/`    | Display name inline-edit with uniqueness check, avatar upload, bio textarea (280 char)                                                                                             |
| `fishing-identity/` | Species/technique pill selectors, home state dropdown, years fishing inline-edit                                                                                                   |
| `notifications/`    | 4 toggle switches for `notification_preferences.email` JSONB — saves immediately on toggle                                                                                         |
| `seller-settings/`  | `is_seller` toggle with real precondition validation — disables toggle when active listings exist, shows dynamic count message, hides products on toggle-off via `useToggleSeller` |
| `linked-accounts/`  | Stripe Connect placeholder (disabled "Connect" button) — ready for future integration                                                                                              |

### MemberCompleteness (`components/member-completeness/`)

Progress bar computing completeness from 5 fields (20% each): `avatar_url`, `bio`, `primary_species`, `primary_technique`, `home_state`. Hidden at 100%.

### StartSellingCta (`components/start-selling-cta/`)

Full-width CTA card shown on the dashboard when `is_seller === false`. Displays a currency icon, headline ("Start selling your gear"), value proposition text, and a "Start selling" button. Accepts `onStartSelling: () => void` callback prop to trigger the seller onboarding modal.

### SellerOnboardingModal (`components/seller-onboarding-modal/`)

2-step modal for post-onboarding seller opt-in. Step 1: terms/info with checkbox acceptance. Step 2: seller type choice (free profile vs shop) using a keyboard-navigable radiogroup card pattern. Choosing "free" calls `useUpdateMember` to set `is_seller: true` with a success toast. Choosing "shop" signals the parent to redirect to `/dashboard/shop/create`. Props: `isOpen`, `onClose`, `userId`, `onComplete(path: 'free' | 'shop')`.

## State Management

The onboarding wizard uses a Zustand store (`stores/onboarding-store.ts`) to hold step data across renders without lifting state to a parent.

- Created with `create<OnboardingState>()` and wrapped with `createSelectors` from `@/libs/create-selectors`
- Access individual slices via auto-generated selectors: `useOnboardingStore.use.currentStep()`, `useOnboardingStore.use.intentData()`, etc.
- **State fields:** `intentData` (intent: buyer/seller/null), `fishingData`, `sellerTypeData` (sellerType: free/shop/null), `bioData`, `avatarUrl`, `totalSteps`, `currentStep`
- **Branching logic:** `nextStep()` skips step 4 when `intent === 'buyer'`. `prevStep()` reverses the skip. `totalSteps` is computed from intent (4 for buyer, 5 for seller).
- **Seller type clearing:** Setting intent to `'buyer'` automatically clears `sellerTypeData`
- Actions: `nextStep()`, `prevStep()`, `goToStep(n)`, `setIntentData()`, `setFishingData()`, `setSellerTypeData()`, `setBioData()`, `setAvatarUrl()`, `reset()`
- `reset()` is called after `completeOnboarding` succeeds to clear state

## Key Patterns

- **Direct Supabase access** — Services use the browser client (`@/libs/supabase/client`) directly, not API routes. RLS policies enforce that users can only read any member but only update their own.
- **Database-derived types** — `Member` type comes from `Database['public']['Tables']['members']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `MemberUpdateInput` omits 11 fields (id, timestamps, Stripe fields, reputation stats, activity stats) that are managed by database triggers or admin operations.
- **Onboarding integration** — The `checkOnboardingComplete()` function in `src/features/auth/services/onboarding.ts` queries this feature's members table for `onboarding_completed_at`.
- **Slug generation** — Member URLs use slugs (e.g., `/user/john-doe-4829`). The auto-create trigger generates slugs on signup; `generateSlug` is available for client-side preview.
- **Avatar storage** — Avatars are stored in the `avatars` bucket (not `listing-images`), one file per user (`{userId}.webp`), upserted on each upload.
- **No display_name** — Members are identified by `first_name + last_name`. The `display_name` column was removed. Custom display names are a shop-only feature.
