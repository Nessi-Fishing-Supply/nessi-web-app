# Profiles Feature

## Overview

Profile management for Nessi's C2C marketplace users. Handles profile data fetching, updates, slug generation, display name availability checks, onboarding status, and a 3-step onboarding wizard that runs on first login.

## Architecture

- **types/profile.ts** — Database-derived types: `Profile` (from profiles Row), `ProfileUpdateInput` (Update minus 11 system-managed fields), `OnboardingStatus`
- **types/onboarding.ts** — Onboarding form types (`OnboardingStep1Data`, `OnboardingStep2Data`, `OnboardingStep3Data`, `OnboardingFormData`) and option constants (`SPECIES_OPTIONS`, `TECHNIQUE_OPTIONS`, `US_STATES`)
- **services/profile.ts** — Direct Supabase queries via browser client (RLS handles authorization, no API routes needed)
- **validations/onboarding.ts** — Yup schemas for each wizard step (`step1Schema`, `step2Schema`, `step3Schema`)
- **stores/onboarding-store.ts** — Zustand store managing wizard step state and collected form data
- **hooks/use-profile.ts** — Tanstack Query hooks for data fetching and mutations

## Service Functions

| Function                          | Purpose                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `getProfile(userId)`              | Fetch profile by user ID, returns `Profile \| null`                          |
| `getProfileBySlug(slug)`          | Fetch profile by URL slug (excludes soft-deleted), returns `Profile \| null` |
| `updateProfile(userId, data)`     | Update allowed profile fields, returns updated `Profile`                     |
| `checkDisplayNameAvailable(name)` | Case-insensitive uniqueness check, returns `boolean`                         |
| `checkSlugAvailable(slug)`        | Slug uniqueness check, returns `boolean`                                     |
| `generateSlug(displayName)`       | Convert display name to URL-safe slug (pure function, no DB call)            |
| `completeOnboarding(userId)`      | Sets `onboarding_completed_at` to now via `updateProfile`, returns `Profile` |

## Hooks

| Hook                               | Query Key                                  | Purpose                                                           |
| ---------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `useProfile(userId, enabled?)`     | `['profiles', userId]`                     | Fetch profile by user ID                                          |
| `useProfileBySlug(slug, enabled?)` | `['profiles', 'slug', slug]`               | Fetch profile by slug                                             |
| `useUpdateProfile()`               | mutation, invalidates `['profiles']`       | Update profile fields                                             |
| `useCompleteOnboarding()`          | mutation, invalidates `['profiles']`       | Mark onboarding complete by setting `onboarding_completed_at`     |
| `useDisplayNameCheck(name)`        | `['profiles', 'display-name-check', name]` | Availability check (enabled when name >= 2 chars, 30s stale time) |

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

Reusable avatar component used in Step 1. Shows initials fallback (deterministic hue from display name hash) when no image is set. On file pick it POSTs to `/api/profiles/avatar` and calls `onUpload(url)` with the returned public URL.

Props:

| Prop          | Type                    | Description                                      |
| ------------- | ----------------------- | ------------------------------------------------ |
| `displayName` | `string`                | Used for initials and background color fallback  |
| `avatarUrl`   | `string \| null`        | Current avatar URL; `null` renders initials      |
| `onUpload`    | `(url: string) => void` | Callback with public URL after successful upload |
| `disabled?`   | `boolean`               | Prevents interaction during external loading     |

## Avatar Upload API

`POST /api/profiles/avatar` — server-side avatar upload route.

- Requires an authenticated session (401 if not logged in)
- Accepts `multipart/form-data` with a `file` field (JPEG, PNG, WebP, or GIF, max 5 MB)
- Uses `sharp` to resize to 200×200 cover crop and re-encodes as WebP at 80% quality
- Stores under `avatars/{userId}.webp` in the `avatars` Supabase Storage bucket with `upsert: true`
- Returns `{ url: string }` — the public URL of the uploaded avatar

## State Management

The onboarding wizard uses a Zustand store (`stores/onboarding-store.ts`) to hold step data across renders without lifting state to a parent.

- Created with `create<OnboardingState>()` and wrapped with `createSelectors` from `@/libs/create-selectors`
- Access individual slices via auto-generated selectors: `useOnboardingStore.use.currentStep()`, `useOnboardingStore.use.step1Data()`, etc.
- Actions: `nextStep()`, `prevStep()`, `setStep1Data(data)`, `setStep2Data(data)`, `setStep3Data(data)`, `setAvatarUrl(url)`, `reset()`
- `reset()` is called after `completeOnboarding` succeeds to clear state

## Account Components

The account page (`/dashboard/account`) displays and edits profile data via collapsible card sections. Components live under `components/account/`.

| Component           | Purpose                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `personal-info/`    | Display name inline-edit with uniqueness check, avatar upload, bio textarea (280 char)     |
| `fishing-identity/` | Species/technique pill selectors, home state dropdown, years fishing inline-edit           |
| `notifications/`    | 4 toggle switches for `notification_preferences.email` JSONB — saves immediately on toggle |
| `linked-accounts/`  | Stripe Connect placeholder (disabled "Connect" button) — ready for future integration      |

### ProfileCompleteness (`components/profile-completeness/`)

Progress bar computing completeness from 5 fields (20% each): `avatar_url`, `bio`, `primary_species`, `primary_technique`, `home_state`. Hidden at 100%.

### Shared Components Used by Account

These generic components live in `src/components/` because they're reusable beyond the profiles feature:

- **`InlineEdit`** (`src/components/controls/inline-edit/`) — Click-to-edit text/textarea with save/cancel, keyboard support (Enter/Escape), character counter. Used by personal-info (display name, bio) and fishing-identity (years fishing).
- **`CollapsibleCard`** (`src/components/layout/collapsible-card/`) — Expandable card with chevron toggle, `aria-expanded`, smooth CSS grid height transition. Wraps all account sections.
- **`PillSelector`** (`src/components/controls/pill-selector/`) — Multi-select pill toggle for `{ value, label }[]` option lists. Used by fishing-identity and onboarding step-fishing-identity.

## Key Patterns

- **Direct Supabase access** — Services use the browser client (`@/libs/supabase/client`) directly, not axios/API routes. RLS policies enforce that users can only read any profile but only update their own.
- **Database-derived types** — `Profile` type comes from `Database['public']['Tables']['profiles']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `ProfileUpdateInput` omits 11 fields (id, timestamps, Stripe fields, reputation stats, activity stats) that are managed by database triggers or admin operations.
- **Onboarding integration** — The `checkOnboardingComplete()` function in `src/features/auth/services/onboarding.ts` queries this feature's profiles table for `onboarding_completed_at`.
- **Slug generation** — Profile URLs use slugs (e.g., `/user/john-doe-4829`). The auto-create trigger generates slugs on signup; `generateSlug` is available for client-side preview.
- **Avatar storage** — Avatars are stored in the `avatars` bucket (not `product-images`), one file per user (`{userId}.webp`), upserted on each upload.
