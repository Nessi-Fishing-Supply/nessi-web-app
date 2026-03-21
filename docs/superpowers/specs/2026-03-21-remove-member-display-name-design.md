# Remove Display Name from Members

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Database schema, onboarding wizard, account page, public profile, services/hooks

## Summary

Members are identified by **first name + last name**. The `display_name` column is removed from the `members` table. Handles (slugs) are auto-generated from the member's name at registration and are immutable. Custom display names, custom handles, and custom slugs are shop-only features (premium).

## Motivation

- Members don't need a separate "display name" — their real name is their identity on the platform
- Simplifies onboarding (one fewer step to think about)
- Creates a natural upsell path: shops get custom branding, custom names, custom handles
- Reduces data duplication — `display_name` was redundant with `first_name + last_name`

## Design

### 1. Database Changes

#### Drop `display_name` from `members`

- Drop the `display_name` column entirely
- The member's displayed name is always computed as `first_name + ' ' + last_name` at the application layer
- No denormalized field — single source of truth

#### Make `first_name` and `last_name` NOT NULL

- Currently nullable — change to `NOT NULL` since they're required at registration
- Existing rows should already have values (collected during registration via `user_metadata`)

#### Handle/slug generation

- Slug is auto-generated from `first_name + last_name` at registration time
- Base slug: `slugify(first_name || '-' || last_name)` → e.g. `kyle-holloway`
- The first user with a given name gets the clean slug (`kyle-holloway`)
- On collision: append incrementing integer suffix: `kyle-holloway-1`, `kyle-holloway-2`, etc.
- This changes from the current behavior (random 4-digit suffix on ALL slugs) to incremental suffix only on collision
- Slug is **immutable** for members — editing first/last name does NOT update the slug
- The existing `slugs` table and `check_slug_available` RPC continue to enforce cross-entity uniqueness
- `checkSlugAvailable()` and `useSlugCheck()` remain — they are used by the shop creation flow

### 2. Onboarding Changes

#### Step 1: "Display Name + Avatar" → "Avatar Only"

**Before:** Pick a display name (with uniqueness check) + upload avatar
**After:** Upload avatar only

- Title: "Add a profile photo"
- Subtitle: "Choose a photo that other anglers will see."
- Avatar upload component stays (with initials fallback from `first_name + last_name`)
- No name input, no availability check, no slug preview
- Next button proceeds when avatar is uploaded OR user chooses to skip

#### Steps 2–5: Unchanged

Intent, Fishing Identity, Seller Type, Bio — no changes.

#### Step 5 (Bio / Finish): Update save payload

- Remove `display_name` and `slug` from the `updateMember` call in `handleFinish`
- These are now set at registration, not during onboarding

#### Onboarding store changes

- Remove `step1Data` (`{ displayName: string }`) from the store
- Remove `setStep1Data` action
- Step 1 only manages avatar state (already tracked via `avatarUrl` in the store)

#### Onboarding types changes

- Remove `OnboardingStep1Data` type
- Remove `displayName` from `OnboardingFormData`

#### Onboarding validations

- Remove `step1Schema` (no form fields to validate on step 1 — it's just an avatar picker)

### 3. Account Page Changes

#### Personal Info section

- **Remove:** Display name inline-edit field and all associated availability checking UI
- **Remove:** Display name availability icon (check/x), error text ("That display name is already taken")
- **Remove:** `handleDisplayNameSave` function (which also updated slug — no longer needed)
- **Keep:** Handle field as read-only static text — update fallback from "Generated from display name" to just showing the handle (all members will have slugs from registration)
- **Keep:** First name / last name inline-edits (unchanged)
- **Keep:** Bio inline-edit (unchanged)
- **Keep:** Avatar upload (unchanged)

#### Profile hero in account page

- Identity block changes from `member.display_name` to `member.first_name + ' ' + member.last_name`

### 4. Service/Hook Cleanup

#### Remove from `services/member.ts`:

- `checkDisplayNameAvailable()` function

#### Remove from `hooks/use-member.ts`:

- `useDisplayNameCheck()` hook

#### Update `services/member.ts`:

- `generateSlug()` stays — still used at registration time
- No longer called from onboarding step 1

### 5. UI Updates (Computed Name)

| Location                           | Before                               | After                                              |
| ---------------------------------- | ------------------------------------ | -------------------------------------------------- |
| Dashboard greeting                 | `member.display_name`                | `member.first_name`                                |
| Navbar identity (member context)   | `user_metadata.firstName + lastName` | No change needed (already correct)                 |
| Public profile heading             | `member.display_name`                | `member.first_name + ' ' + member.last_name`       |
| Public profile OG/metadata         | `member.display_name`                | `member.first_name + ' ' + member.last_name`       |
| Public profile initials fallback   | `display_name.charAt(0)`             | `first_name.charAt(0) + last_name.charAt(0)`       |
| Account page identity block        | `member.display_name`                | `member.first_name + ' ' + member.last_name`       |
| Avatar initials (onboarding)       | From `displayName` prop              | From `first_name + last_name` (auth user metadata) |
| "Logged in as" hint (shop context) | `member.display_name`                | `member.first_name + ' ' + member.last_name`       |

### 6. Registration Flow Update

The `handle_new_user()` trigger on `auth.users` must be rewritten. Current trigger generates slug from `first_name` only with a random suffix. New behavior:

```sql
-- Pseudo-SQL for the updated trigger
_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', 'User');
_last_name  := COALESCE(NEW.raw_user_meta_data->>'lastName', 'Angler');
_base_slug  := slugify(_first_name || '-' || _last_name);

-- Collision handling: try base, then -1, -2, etc.
_candidate := _base_slug;
_counter   := 0;
LOOP
  IF NOT EXISTS (SELECT 1 FROM public.slugs WHERE slug = _candidate) THEN
    EXIT;
  END IF;
  _counter   := _counter + 1;
  _candidate := _base_slug || '-' || _counter;
END LOOP;

-- Insert member row (no display_name)
INSERT INTO public.members (id, first_name, last_name, slug)
VALUES (NEW.id, _first_name, _last_name, _candidate);

-- Reserve slug in slugs table
INSERT INTO public.slugs (slug, entity_type, entity_id)
VALUES (_candidate, 'member', NEW.id);
```

Note: `last_name` defaults to `'Angler'` if somehow missing — defensive fallback since both fields should always be present from the registration form.

### 7. Migration Strategy

Single migration file, steps executed in this exact order within one transaction:

1. **Backfill nulls** — Copy `display_name` into `first_name`/`last_name` for any rows where they're null (safety net for edge cases)
2. **Update `handle_new_user()` trigger** — Rewrite to stop referencing `display_name`, use `first_name + last_name` for slug generation with incremental collision handling (see Section 6)
3. **Alter `first_name` and `last_name` to `NOT NULL`** — Safe now that nulls are backfilled
4. **Drop `members_display_name_unique` index** (case-insensitive unique index on `display_name`)
5. **Drop `display_name_length` CHECK constraint** (enforces 3-40 char length)
6. **Drop `display_name` column**

Ordering is critical: the trigger must stop referencing `display_name` BEFORE the column is dropped, otherwise any concurrent registration would fail.

7. Regenerate TypeScript types via `pnpm db:types`

**Data note:** Some existing members may have a `display_name` like "BassKing" that differs from their real name. After migration, these members will display as their real first/last name. This is expected — the display name concept no longer exists for members.

## What's NOT Changing

- Slug system / `slugs` table / `check_slug_available` RPC
- Avatar upload pipeline (API route, storage, sharp processing)
- Shop names/handles (separate `shops` table, unaffected)
- Bio, fishing identity, seller type onboarding steps
- Notification preferences, seller settings, linked accounts on account page

## AvatarUpload Prop Update

The `AvatarUpload` component accepts a `displayName` prop used for the `alt` attribute on the avatar image. Rename to `name` (more generic — works for both members and shops):

- Rename prop: `displayName` → `name`
- Update all callers:
  - `step-display-name/` (becomes avatar-only step) → pass `formatMemberName(firstName, lastName)` from auth user metadata
  - `personal-info/` → pass `formatMemberName(member.first_name, member.last_name)`
  - `shop-details-section/` → pass `shop.shop_name ?? ''`

## `generateSlug` Parameter Rename

The `generateSlug()` utility in `src/features/shared/utils/slug.ts` has a parameter named `displayName`. Rename to `name` for clarity after this change.

## Helper: Full Name Utility

Create a small utility for consistent name formatting across the app:

```typescript
// src/features/members/utils/format-name.ts
export function formatMemberName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function getMemberInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
```

## Files Affected

### Modified

- `supabase/migrations/` — new migration (drop column, alter nullability, update trigger)
- `src/types/database.ts` — regenerated (no `display_name`)
- `src/features/members/stores/onboarding-store.ts` — remove `step1Data`, `setStep1Data`
- `src/features/members/types/onboarding.ts` — remove `OnboardingStep1Data`
- `src/features/members/types/member.ts` — no change needed (derived from DB types)
- `src/features/members/validations/onboarding.ts` — remove `step1Schema`
- `src/features/members/services/member.ts` — remove `checkDisplayNameAvailable`
- `src/features/members/hooks/use-member.ts` — remove `useDisplayNameCheck`
- `src/features/members/components/onboarding/step-display-name/` — rewrite as avatar-only step
- `src/features/members/components/onboarding/step-bio/index.tsx` — remove `display_name`/`slug` from save
- `src/features/members/components/account/personal-info/index.tsx` — remove display name field
- `src/app/(frontend)/dashboard/page.tsx` — use `first_name` for greeting
- `src/app/(frontend)/member/[slug]/page.tsx` — use `first_name + last_name`
- `src/features/members/components/avatar-upload/index.tsx` — update initials prop
- `src/features/members/CLAUDE.md` — update documentation

### Created

- `src/features/members/utils/format-name.ts` — name formatting utilities

### Potentially removed

- `src/features/members/components/onboarding/step-display-name/step-display-name.module.scss` — may be replaced or simplified
