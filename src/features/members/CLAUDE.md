# Members Feature

## Overview

Member profile management for Nessi's C2C marketplace users. Handles member data fetching, updates, slug generation, display name availability checks, onboarding status, and a 3-step onboarding wizard that runs on first login.

## Architecture

- **types/member.ts** — Database-derived types: `Member` (from members Row), `MemberUpdateInput` (Update minus 11 system-managed fields), `OnboardingStatus`
- **types/onboarding.ts** — Onboarding form types (`OnboardingStep1Data`, `OnboardingStep2Data`, `OnboardingStep3Data`, `OnboardingFormData`) and option constants (`SPECIES_OPTIONS`, `TECHNIQUE_OPTIONS`, `US_STATES`)
- **services/member.ts** — Direct Supabase queries via browser client (RLS handles authorization, no API routes needed)
- **validations/onboarding.ts** — Yup schemas for each wizard step (`step1Schema`, `step2Schema`, `step3Schema`)
- **stores/onboarding-store.ts** — Zustand store managing wizard step state and collected form data
- **hooks/use-member.ts** — Tanstack Query hooks for data fetching and mutations

## Service Functions

| Function                          | Purpose                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `getMember(userId)`               | Fetch member by user ID, returns `Member \| null`                                             |
| `getMemberBySlug(slug)`           | Fetch member by URL slug (excludes soft-deleted), returns `Member \| null`                    |
| `updateMember(userId, data)`      | Update allowed member fields, returns updated `Member`                                        |
| `checkDisplayNameAvailable(name)` | Case-insensitive uniqueness check on `display_name`, returns `boolean`                        |
| `checkSlugAvailable(slug)`        | Slug uniqueness check via `check_slug_available` RPC against `slugs` table, returns `boolean` |
| `generateSlug(displayName)`       | Convert display name to URL-safe slug (pure function, no DB call)                             |
| `completeOnboarding(userId)`      | Sets `onboarding_completed_at` to now via `updateMember`, returns `Member`                    |

## Hooks

| Hook                              | Query Key                                 | Purpose                                                                                    |
| --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `useMember(userId, enabled?)`     | `['members', userId]`                     | Fetch member by user ID                                                                    |
| `useMemberBySlug(slug, enabled?)` | `['members', 'slug', slug]`               | Fetch member by slug                                                                       |
| `useUpdateMember()`               | mutation, invalidates `['members']`       | Update member fields                                                                       |
| `useCompleteOnboarding()`         | mutation, invalidates `['members']`       | Mark onboarding complete by setting `onboarding_completed_at`                              |
| `useDisplayNameCheck(name)`       | `['members', 'display-name-check', name]` | Availability check (enabled when name >= 2 chars, 30s stale time)                          |
| `useSlugCheck(slug, enabled?)`    | `['slugs', 'check', slug]`                | Slug availability check via slugs table RPC (enabled when slug >= 2 chars, 30s stale time) |

## Onboarding Components

The wizard lives under `components/onboarding/` and is composed of step-specific forms, a container, and a progress indicator.

| Component                | Purpose                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `onboarding-wizard/`     | Main container — reads auth state, guards against unauthenticated access, routes between steps   |
| `step-display-name/`     | Step 1 — display name text input with real-time availability check + `AvatarUpload` integration  |
| `step-fishing-identity/` | Step 2 — species and technique `PillSelector` multi-selects + home state dropdown (all optional) |
| `step-bio/`              | Step 3 — bio textarea (280 char max), calls `useCompleteOnboarding` on submit                    |
| `progress-indicator/`    | 3-circle step progress bar, highlights current step, used inside the wizard container            |

### AvatarUpload (`components/avatar-upload/`)

Reusable avatar component used in Step 1. Shows initials fallback (deterministic hue from display name hash) when no image is set. On file pick it POSTs to `/api/members/avatar` and calls `onUpload(url)` with the returned public URL.

## Avatar Upload API

`POST /api/members/avatar` — server-side avatar upload route.

- Requires an authenticated session (401 if not logged in)
- Accepts `multipart/form-data` with a `file` field (JPEG, PNG, WebP, or GIF, max 5 MB)
- Uses `sharp` to resize to 200x200 cover crop and re-encodes as WebP at 80% quality
- Stores under `avatars/{userId}.webp` in the `avatars` Supabase Storage bucket with `upsert: true`
- Returns `{ url: string }` — the public URL of the uploaded avatar

## Account Components

The account page (`/dashboard/account`) displays and edits member data via collapsible card sections. Components live under `components/account/`.

| Component           | Purpose                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `personal-info/`    | Display name inline-edit with uniqueness check, avatar upload, bio textarea (280 char)                                 |
| `fishing-identity/` | Species/technique pill selectors, home state dropdown, years fishing inline-edit                                       |
| `notifications/`    | 4 toggle switches for `notification_preferences.email` JSONB — saves immediately on toggle                             |
| `seller-settings/`  | `is_seller` toggle switch with inline warning on disable, placeholder precondition guards, saves via `useUpdateMember` |
| `linked-accounts/`  | Stripe Connect placeholder (disabled "Connect" button) — ready for future integration                                  |

### MemberCompleteness (`components/member-completeness/`)

Progress bar computing completeness from 5 fields (20% each): `avatar_url`, `bio`, `primary_species`, `primary_technique`, `home_state`. Hidden at 100%.

## State Management

The onboarding wizard uses a Zustand store (`stores/onboarding-store.ts`) to hold step data across renders without lifting state to a parent.

- Created with `create<OnboardingState>()` and wrapped with `createSelectors` from `@/libs/create-selectors`
- Access individual slices via auto-generated selectors: `useOnboardingStore.use.currentStep()`, `useOnboardingStore.use.step1Data()`, etc.
- Actions: `nextStep()`, `prevStep()`, `setStep1Data(data)`, `setStep2Data(data)`, `setStep3Data(data)`, `setAvatarUrl(url)`, `reset()`
- `reset()` is called after `completeOnboarding` succeeds to clear state

## Key Patterns

- **Direct Supabase access** — Services use the browser client (`@/libs/supabase/client`) directly, not axios/API routes. RLS policies enforce that users can only read any member but only update their own.
- **Database-derived types** — `Member` type comes from `Database['public']['Tables']['members']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `MemberUpdateInput` omits 11 fields (id, timestamps, Stripe fields, reputation stats, activity stats) that are managed by database triggers or admin operations.
- **Onboarding integration** — The `checkOnboardingComplete()` function in `src/features/auth/services/onboarding.ts` queries this feature's members table for `onboarding_completed_at`.
- **Slug generation** — Member URLs use slugs (e.g., `/user/john-doe-4829`). The auto-create trigger generates slugs on signup; `generateSlug` is available for client-side preview.
- **Avatar storage** — Avatars are stored in the `avatars` bucket (not `product-images`), one file per user (`{userId}.webp`), upserted on each upload.
