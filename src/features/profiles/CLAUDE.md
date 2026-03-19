# Profiles Feature

## Overview

Profile management for Nessi's C2C marketplace users. Handles profile data fetching, updates, slug generation, display name availability checks, and onboarding status.

## Architecture

- **types/profile.ts** — Database-derived types: `Profile` (from profiles Row), `ProfileUpdateInput` (Update minus 11 system-managed fields), `OnboardingStatus`
- **services/profile.ts** — Direct Supabase queries via browser client (RLS handles authorization, no API routes needed)
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

## Hooks

| Hook                               | Query Key                                  | Purpose                                                           |
| ---------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `useProfile(userId, enabled?)`     | `['profiles', userId]`                     | Fetch profile by user ID                                          |
| `useProfileBySlug(slug, enabled?)` | `['profiles', 'slug', slug]`               | Fetch profile by slug                                             |
| `useUpdateProfile()`               | mutation, invalidates `['profiles']`       | Update profile fields                                             |
| `useDisplayNameCheck(name)`        | `['profiles', 'display-name-check', name]` | Availability check (enabled when name >= 2 chars, 30s stale time) |

## Key Patterns

- **Direct Supabase access** — Services use the browser client (`@/libs/supabase/client`) directly, not axios/API routes. RLS policies enforce that users can only read any profile but only update their own.
- **Database-derived types** — `Profile` type comes from `Database['public']['Tables']['profiles']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `ProfileUpdateInput` omits 11 fields (id, timestamps, Stripe fields, reputation stats, activity stats) that are managed by database triggers or admin operations.
- **Onboarding integration** — The `checkOnboardingComplete()` function in `src/features/auth/services/onboarding.ts` queries this feature's profiles table for `onboarding_completed_at`.
- **Slug generation** — Profile URLs use slugs (e.g., `/user/john-doe-4829`). The auto-create trigger generates slugs on signup; `generateSlug` is available for client-side preview.
