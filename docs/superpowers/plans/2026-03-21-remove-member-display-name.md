# Remove Member Display Name — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `display_name` from members so they're always identified by `first_name + last_name`, with auto-generated immutable handles.

**Architecture:** SQL migration drops the column and rewrites the registration trigger. Application code replaces all `display_name` references with computed `first_name + last_name`. Onboarding step 1 becomes avatar-only.

**Tech Stack:** Supabase PostgreSQL, Next.js 16 App Router, TypeScript, Zustand, Tanstack Query, SCSS Modules

**Spec:** `docs/superpowers/specs/2026-03-21-remove-member-display-name-design.md`

---

## File Structure

### Created

- `src/features/members/utils/format-name.ts` — `formatMemberName()` and `getMemberInitials()` helpers

### Modified (by task)

| File                                                                                         | Task | Change                                 |
| -------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| `supabase/migrations/2026XXXX_remove_display_name.sql`                                       | 1    | New migration file                     |
| `src/types/database.ts`                                                                      | 1    | Regenerated (no `display_name`)        |
| `src/features/shared/utils/slug.ts`                                                          | 2    | Rename param `displayName` → `name`    |
| `src/features/members/services/member.ts`                                                    | 2    | Remove `checkDisplayNameAvailable()`   |
| `src/features/members/hooks/use-member.ts`                                                   | 2    | Remove `useDisplayNameCheck()`         |
| `src/features/members/types/onboarding.ts`                                                   | 3    | Remove `OnboardingStep1Data`           |
| `src/features/members/validations/onboarding.ts`                                             | 3    | Remove `step1Schema`                   |
| `src/features/members/stores/onboarding-store.ts`                                            | 3    | Remove `step1Data`, `setStep1Data`     |
| `src/features/members/components/avatar-upload/index.tsx`                                    | 4    | Rename `displayName` → `name` prop     |
| `src/features/members/components/onboarding/step-display-name/index.tsx`                     | 4    | Rewrite as avatar-only step            |
| `src/features/members/components/onboarding/step-display-name/step-display-name.module.scss` | 4    | Simplify styles                        |
| `src/features/members/components/onboarding/step-bio/index.tsx`                              | 5    | Remove `display_name`/`slug` from save |
| `src/features/members/components/account/personal-info/index.tsx`                            | 6    | Remove display name field              |
| `src/app/(frontend)/dashboard/page.tsx`                                                      | 7    | Use `first_name` for greeting          |
| `src/app/(frontend)/member/[slug]/page.tsx`                                                  | 7    | Use `first_name + last_name`           |
| `src/features/members/CLAUDE.md`                                                             | 8    | Update documentation                   |
| `src/features/shops/components/shop-settings/shop-details-section/index.tsx`                 | 4    | Update AvatarUpload caller             |

---

## Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20260321000001_remove_display_name_from_members.sql`
- Modify: `src/types/database.ts` (regenerated)

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260321000001_remove_display_name_from_members.sql`:

```sql
-- ============================================================
-- Remove display_name from members
-- Members are identified by first_name + last_name only.
-- Handles auto-generated at registration, immutable for members.
-- Supabase runs each migration file in an implicit transaction.
-- ============================================================

-- Step 1: Backfill any null first_name/last_name from display_name
-- For first_name: take the first word of display_name
UPDATE public.members
SET first_name = COALESCE(first_name, SPLIT_PART(display_name, ' ', 1), 'User')
WHERE first_name IS NULL;

-- For last_name: if display_name has no space (e.g. "BassKing"), use 'Angler' fallback
UPDATE public.members
SET last_name = CASE
  WHEN last_name IS NOT NULL THEN last_name
  WHEN POSITION(' ' IN display_name) > 0
    THEN TRIM(SUBSTRING(display_name FROM POSITION(' ' IN display_name) + 1))
  ELSE 'Angler'
END
WHERE last_name IS NULL;

-- Step 2: Rewrite handle_new_user() to stop referencing display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _first_name TEXT;
  _last_name TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _counter INTEGER := 0;
BEGIN
  _first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), 'User');
  _last_name  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''), 'Angler');

  -- Generate base slug from first-last name
  _base_slug := LOWER(_first_name || '-' || _last_name);
  _base_slug := REGEXP_REPLACE(_base_slug, '[^a-z0-9]+', '-', 'g');
  _base_slug := TRIM(BOTH '-' FROM _base_slug);

  -- Try clean slug first, then increment on collision
  _slug := _base_slug;
  LOOP
    BEGIN
      INSERT INTO public.members (id, first_name, last_name, slug)
      VALUES (NEW.id, _first_name, _last_name, _slug);

      INSERT INTO public.slugs (slug, entity_type, entity_id)
      VALUES (_slug, 'member', NEW.id);

      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      _counter := _counter + 1;
      IF _counter >= 100 THEN
        RAISE EXCEPTION 'Could not generate unique slug for user % after 100 attempts', NEW.id;
      END IF;
      _slug := _base_slug || '-' || _counter;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Make first_name and last_name NOT NULL
ALTER TABLE public.members ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.members ALTER COLUMN last_name SET NOT NULL;

-- Step 4: Drop the display_name unique index (renamed from profiles_display_name_unique)
DROP INDEX IF EXISTS public.profiles_display_name_unique;
DROP INDEX IF EXISTS public.members_display_name_unique;

-- Step 5: Drop the display_name_length constraint
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS display_name_length;

-- Step 6: Drop the display_name column
ALTER TABLE public.members DROP COLUMN display_name;
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `pnpm db:types`

This regenerates `src/types/database.ts`. Verify:

- `display_name` no longer appears in the `members` type
- `first_name` and `last_name` are now `string` (not `string | null`)

- [ ] **Step 3: Verify TypeScript errors surface**

Run: `pnpm typecheck 2>&1 | head -80`

Expected: Multiple TS errors referencing `display_name` across the codebase. This confirms the migration propagated correctly. These errors will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260321000001_remove_display_name_from_members.sql src/types/database.ts
git commit -m "feat(db): remove display_name from members, make first/last name NOT NULL

Rewrites handle_new_user() trigger to generate slugs from
first_name + last_name with incremental collision handling.
Members are now identified by first/last name only."
```

---

## Task 2: Create Name Utilities and Clean Up Services

**Files:**

- Create: `src/features/members/utils/format-name.ts`
- Modify: `src/features/shared/utils/slug.ts`
- Modify: `src/features/members/services/member.ts`
- Modify: `src/features/members/hooks/use-member.ts`

- [ ] **Step 1: Create format-name utility**

Create `src/features/members/utils/format-name.ts`:

```typescript
export function formatMemberName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function getMemberInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
```

- [ ] **Step 2: Rename slug utility parameter**

In `src/features/shared/utils/slug.ts`, rename the parameter from `displayName` to `name`:

```typescript
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
```

- [ ] **Step 3: Remove `checkDisplayNameAvailable` from member service**

In `src/features/members/services/member.ts`, delete the entire `checkDisplayNameAvailable` function (lines 50-63) and its related import if any.

- [ ] **Step 4: Remove `useDisplayNameCheck` from hooks**

In `src/features/members/hooks/use-member.ts`:

- Remove `checkDisplayNameAvailable` from the import block (lines 2-9)
- Delete the entire `useDisplayNameCheck` function (lines 65-71)

- [ ] **Step 5: Run typecheck to verify removals**

Run: `pnpm typecheck 2>&1 | head -80`

Expected: Errors should now be reduced — the services/hooks are clean. Remaining errors will be in components that still reference `display_name` or `useDisplayNameCheck`.

- [ ] **Step 6: Commit**

```bash
git add src/features/members/utils/format-name.ts src/features/shared/utils/slug.ts src/features/members/services/member.ts src/features/members/hooks/use-member.ts
git commit -m "feat(members): add name utilities, remove display name service/hooks

Add formatMemberName() and getMemberInitials() helpers.
Remove checkDisplayNameAvailable() and useDisplayNameCheck().
Rename generateSlug parameter from displayName to name."
```

---

## Task 3: Update Onboarding Store, Types, and Validations

**Files:**

- Modify: `src/features/members/types/onboarding.ts`
- Modify: `src/features/members/validations/onboarding.ts`
- Modify: `src/features/members/stores/onboarding-store.ts`

- [ ] **Step 1: Remove `OnboardingStep1Data` from types**

In `src/features/members/types/onboarding.ts`:

- Delete `OnboardingStep1Data` type (lines 5-7)
- Update `OnboardingFormData` to remove `OnboardingStep1Data &` from the intersection:

```typescript
export type OnboardingFormData = OnboardingIntentData &
  OnboardingFishingData &
  OnboardingSellerTypeData &
  OnboardingBioData;
```

- [ ] **Step 2: Remove `step1Schema` from validations**

In `src/features/members/validations/onboarding.ts`, delete the `step1Schema` export (lines 3-9).

- [ ] **Step 3: Remove `step1Data` from onboarding store**

In `src/features/members/stores/onboarding-store.ts`:

- Remove the `OnboardingStep1Data` import
- Remove `step1Data: OnboardingStep1Data` from the `OnboardingState` interface
- Remove `setStep1Data: (data: OnboardingStep1Data) => void` from the interface
- Remove `step1Data: { displayName: '' }` from `initialState`
- Remove `setStep1Data: (data) => set({ step1Data: data })` from the store

The store should keep `avatarUrl` and `setAvatarUrl` — those still power step 1.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck 2>&1 | head -80`

Expected: More errors resolved. Remaining errors should be in the onboarding components and account page.

- [ ] **Step 5: Commit**

```bash
git add src/features/members/types/onboarding.ts src/features/members/validations/onboarding.ts src/features/members/stores/onboarding-store.ts
git commit -m "refactor(onboarding): remove display name from store, types, validations

Step 1 no longer collects a display name — it's avatar-only.
Remove OnboardingStep1Data, step1Schema, step1Data from store."
```

---

## Task 4: Rewrite Onboarding Step 1 and Update AvatarUpload

**Files:**

- Modify: `src/features/members/components/avatar-upload/index.tsx`
- Modify: `src/features/members/components/onboarding/step-display-name/index.tsx`
- Modify: `src/features/members/components/onboarding/step-display-name/step-display-name.module.scss`
- Modify: `src/features/shops/components/shop-settings/shop-details-section/index.tsx`

- [ ] **Step 1: Rename AvatarUpload prop `displayName` → `name`**

In `src/features/members/components/avatar-upload/index.tsx`:

- In the interface, rename `displayName: string` to `name: string`
- In the destructured props, rename `displayName` to `name`
- On line 98, change `alt={displayName}` to `alt={name}`

- [ ] **Step 2: Update AvatarUpload callers — shop-details-section**

In `src/features/shops/components/shop-settings/shop-details-section/index.tsx`:

- Change the `displayName` prop to `name` on the `AvatarUpload` usage

- [ ] **Step 3: Rewrite step-display-name as avatar-only step**

Replace `src/features/members/components/onboarding/step-display-name/index.tsx` entirely:

```tsx
'use client';

import AvatarUpload from '@/features/members/components/avatar-upload';
import { useAuth } from '@/features/auth/context';
import { formatMemberName } from '@/features/members/utils/format-name';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import Button from '@/components/controls/button';
import styles from './step-display-name.module.scss';

export default function StepAvatar() {
  const { user } = useAuth();
  const avatarUrl = useOnboardingStore.use.avatarUrl();
  const setAvatarUrl = useOnboardingStore.use.setAvatarUrl();
  const nextStep = useOnboardingStore.use.nextStep();

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';
  const fullName = formatMemberName(firstName, lastName);

  return (
    <div className={styles.container}>
      <div className={styles.formBody}>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Add a profile photo</h2>
          <p className={styles.stepSubtitle}>Choose a photo that other anglers will see.</p>
        </div>

        <div className={styles.avatarSection}>
          <AvatarUpload
            name={fullName}
            avatarUrl={avatarUrl}
            onUpload={(url) => setAvatarUrl(url)}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          type="button"
          style="primary"
          fullWidth
          onClick={nextStep}
          ariaLabel="Continue to next step"
        >
          {avatarUrl ? 'Next' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Simplify the SCSS**

Replace `src/features/members/components/onboarding/step-display-name/step-display-name.module.scss`:

```scss
@use '@/styles/mixins/breakpoints' as *;

.container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.formBody {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  flex: 1;
  padding: var(--space-lg) var(--space-base);
  align-items: center;

  @include breakpoint(md) {
    padding: var(--space-xl) var(--space-lg);
  }
}

.stepHeader {
  text-align: center;
}

.stepTitle {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-dark);
  margin: 0;
  letter-spacing: -0.02em;

  @include breakpoint(md) {
    font-size: var(--font-size-2xl);
  }
}

.stepSubtitle {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  margin: var(--space-2xs) 0 0;
  line-height: 1.5;
}

.avatarSection {
  display: flex;
  justify-content: center;
}

.footer {
  position: sticky;
  bottom: 0;
  padding: var(--space-base) var(--space-lg);
  background: linear-gradient(to top, var(--color-white) 80%, transparent);

  @include breakpoint(md) {
    position: static;
    padding: var(--space-md) var(--space-lg) var(--space-lg);
    background: var(--color-white);
  }
}
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck 2>&1 | head -40`

Expected: Step-display-name errors resolved. Remaining errors in step-bio, personal-info, dashboard, and public profile.

- [ ] **Step 6: Commit**

```bash
git add src/features/members/components/avatar-upload/index.tsx src/features/members/components/onboarding/step-display-name/ src/features/shops/components/shop-settings/shop-details-section/index.tsx
git commit -m "feat(onboarding): rewrite step 1 as avatar-only, rename AvatarUpload prop

Step 1 no longer collects display name — just profile photo.
Rename AvatarUpload displayName prop to name for clarity."
```

---

## Task 5: Update Onboarding Step Bio Save Payload

**Files:**

- Modify: `src/features/members/components/onboarding/step-bio/index.tsx`

- [ ] **Step 1: Remove display_name and slug from handleFinish**

In `src/features/members/components/onboarding/step-bio/index.tsx`:

- Remove the `step1Data` store selector (line 23)
- Remove the `generateSlug` import (line 10)
- In `handleFinish`, remove `display_name: step1Data.displayName` and `slug: generateSlug(step1Data.displayName)` from the `updateMember.mutateAsync` data object (lines 59-60)

The updated data object should be:

```typescript
data: {
  avatar_url: avatarUrl,
  primary_species: fishingData.primarySpecies,
  primary_technique: fishingData.primaryTechnique,
  home_state: fishingData.homeState || null,
  bio: bioValue || null,
  ...(isSeller ? { is_seller: true } : {}),
},
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck 2>&1 | head -40`

Expected: Step-bio clean. Remaining errors in account page and UI pages.

- [ ] **Step 3: Commit**

```bash
git add src/features/members/components/onboarding/step-bio/index.tsx
git commit -m "fix(onboarding): remove display_name and slug from bio step save

These fields are now set at registration by the DB trigger,
not during onboarding."
```

---

## Task 6: Update Account Page Personal Info

**Files:**

- Modify: `src/features/members/components/account/personal-info/index.tsx`

- [ ] **Step 1: Remove display name editing from PersonalInfo**

In `src/features/members/components/account/personal-info/index.tsx`:

- Remove imports: `HiCheckCircle`, `HiXCircle` (from `react-icons/hi`), `useDisplayNameCheck` (from hooks), `generateSlug` (from services)
- Remove all display name state: `draftName`, `setDraftName`, `debouncedName`, `setDebouncedName`
- Remove the `useEffect` debounce timer (lines 26-31)
- Remove all display name availability logic: `isCurrentName`, `isAvailable`, `isChecking`, `availabilityKnown`, `nameAvailable`, `nameTaken`, `showAvailabilityIcon`
- Remove `handleDisplayNameChange` and `handleDisplayNameSave` functions
- Add import: `import { formatMemberName } from '@/features/members/utils/format-name';`
- Update identity block (line 141): change `member.display_name` to `formatMemberName(member.first_name, member.last_name)`
- Update AvatarUpload prop: `name={formatMemberName(member.first_name, member.last_name)}`
- Remove the entire display name field row (lines 180-208) from the JSX
- Update handle field fallback text (line 214): change `'Generated from display name'` to `member.slug ? \`@${member.slug}\` : ''` (all members should have slugs)
- **Fix null saves:** Update `handleFirstNameSave` to use `{ first_name: newFirstName.trim() || member.first_name }` (never pass null — column is now NOT NULL). Same for `handleLastNameSave`: `{ last_name: newLastName.trim() || member.last_name }`. This prevents saving empty strings as null which would violate the NOT NULL constraint.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck 2>&1 | head -40`

Expected: Personal info clean. Remaining errors in dashboard and public profile pages.

- [ ] **Step 3: Commit**

```bash
git add src/features/members/components/account/personal-info/index.tsx
git commit -m "refactor(account): remove display name editing from personal info

Members are identified by first/last name only.
Display name field, availability checking, and slug updates removed."
```

---

## Task 7: Update Dashboard and Public Profile Pages

**Files:**

- Modify: `src/app/(frontend)/dashboard/page.tsx`
- Modify: `src/app/(frontend)/member/[slug]/page.tsx`

- [ ] **Step 1: Update dashboard greeting**

In `src/app/(frontend)/dashboard/page.tsx`:

- Line 40: Change `member?.display_name` to `member?.first_name`
- Line 50: Change `member.display_name` to `formatMemberName(member.first_name, member.last_name)`
- Add import: `import { formatMemberName } from '@/features/members/utils/format-name';`

- [ ] **Step 2: Update public member profile**

In `src/app/(frontend)/member/[slug]/page.tsx`:

- Add import: `import { formatMemberName, getMemberInitials } from '@/features/members/utils/format-name';`
- In `generateMetadata`:
  - Line 24: Change `member.display_name` to `formatMemberName(member.first_name, member.last_name)` (description fallback)
  - Line 27-30: Change both `member.display_name` refs to the formatted name
- In the component:
  - Line 52: Change `member.display_name.charAt(0).toUpperCase()` to `getMemberInitials(member.first_name, member.last_name)`
  - Line 64: Change `alt={member.display_name}` to `alt={formatMemberName(member.first_name, member.last_name)}` (add `'s avatar` suffix too)
  - Line 76: Change `member.display_name` heading to `formatMemberName(member.first_name, member.last_name)`

- [ ] **Step 3: Run full typecheck — expect zero errors**

Run: `pnpm typecheck`

Expected: PASS — zero TypeScript errors.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: PASS (or only pre-existing warnings unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add src/app/(frontend)/dashboard/page.tsx src/app/(frontend)/member/[slug]/page.tsx
git commit -m "feat(pages): use first/last name instead of display_name

Dashboard greeting uses first_name.
Public profile uses formatMemberName() for heading, metadata, and OG tags."
```

---

## Task 8: Update Documentation and Final Verification

**Files:**

- Modify: `src/features/members/CLAUDE.md`

- [ ] **Step 1: Update members CLAUDE.md**

Key changes to `src/features/members/CLAUDE.md`:

- Remove `checkDisplayNameAvailable` from service functions table
- Remove `useDisplayNameCheck` from hooks table
- Add `formatMemberName` and `getMemberInitials` to a new "Utilities" section
- Update step-display-name description to "Step 1 — avatar upload only (no name input)"
- Update overview to mention members are identified by first_name + last_name
- Update "Key Patterns" to note `display_name` no longer exists
- Remove references to display name availability checking

- [ ] **Step 2: Run full quality checks**

Run sequentially:

```bash
pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm format:check
```

Expected: All pass.

- [ ] **Step 3: Run tests**

Run: `pnpm test:run`

Expected: All existing tests pass (some may need updates if they reference `display_name`).

- [ ] **Step 4: Run build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/members/CLAUDE.md
git commit -m "docs: update members CLAUDE.md for display_name removal

Remove display name references, add format-name utilities,
update onboarding step descriptions."
```

---

## Summary

| Task      | Description                                       | Estimated Steps |
| --------- | ------------------------------------------------- | --------------- |
| 1         | Database migration (drop column, rewrite trigger) | 4               |
| 2         | Name utilities + service/hook cleanup             | 6               |
| 3         | Onboarding store, types, validations              | 5               |
| 4         | Rewrite step 1 + AvatarUpload prop rename         | 6               |
| 5         | Step bio save payload                             | 3               |
| 6         | Account page personal info                        | 3               |
| 7         | Dashboard + public profile pages                  | 5               |
| 8         | Documentation + final verification                | 5               |
| **Total** |                                                   | **37 steps**    |
