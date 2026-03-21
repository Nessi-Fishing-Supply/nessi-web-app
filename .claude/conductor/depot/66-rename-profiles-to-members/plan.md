# Implementation Plan: #66 — Rename profiles feature to members

## Overview
3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Create members feature with renamed types, services, and hooks
**Goal:** Create `src/features/members/` with all files from `src/features/profiles/` renamed to use `Member`/`members`/`display_name` terminology, while keeping the old directory intact so existing imports still resolve.
**Verify:** `pnpm build`

### Task 1.1: Create members types directory with renamed types
Create `src/features/members/types/` with `member.ts` and `onboarding.ts`. In `member.ts`, export `Member` (from `Database['public']['Tables']['members']['Row']`) and `MemberUpdateInput` (same Omit pattern but referencing `members` table). Copy `onboarding.ts` as-is (no profile-specific names in it). Also copy `validations/onboarding.ts` unchanged (it only references `displayName` which is already correct).
**Files:**
- `src/features/members/types/member.ts` (create)
- `src/features/members/types/onboarding.ts` (create — copy from profiles)
- `src/features/members/validations/onboarding.ts` (create — copy from profiles)
**AC:** `Member` and `MemberUpdateInput` types reference `Database['public']['Tables']['members']`. `OnboardingStatus` is exported from `member.ts`. No references to `profiles` or `Profile` in any new file.
**Expert Domains:** supabase

### Task 1.2: Create members service with renamed functions and queries
Create `src/features/members/services/member.ts` with all functions from `profile.ts` renamed: `getProfile` -> `getMember`, `getProfileBySlug` -> `getMemberBySlug`, `updateProfile` -> `updateMember`, `checkShopNameAvailable` -> `checkDisplayNameAvailable`, `checkSlugAvailable` (keep name), `generateSlug` (keep name), `completeOnboarding` (keep name). All `from('profiles')` calls become `from('members')`. The `.ilike('shop_name', name)` becomes `.ilike('display_name', name)`. Import types from `@/features/members/types/member`. Error messages updated from "profile" to "member".
**Files:**
- `src/features/members/services/member.ts` (create)
**AC:** No `from('profiles')`, no `shop_name`, no `Profile` type references. All function names use `Member` where they previously used `Profile`. `generateSlug` and `completeOnboarding` retain their names.
**Expert Domains:** supabase

### Task 1.3: Create members hooks with renamed exports and query keys
Create `src/features/members/hooks/use-member.ts` with hooks renamed: `useProfile` -> `useMember`, `useProfileBySlug` -> `useMemberBySlug`, `useUpdateProfile` -> `useUpdateMember`, `useCompleteOnboarding` (keep name), `useShopNameCheck` -> `useDisplayNameCheck`. Query keys change from `['profiles', ...]` to `['members', ...]`. The display name check key changes from `'shop-name-check'` to `'display-name-check'`. Import service functions from `@/features/members/services/member` and types from `@/features/members/types/member`.
**Files:**
- `src/features/members/hooks/use-member.ts` (create)
**AC:** No imports from `@/features/profiles/`. All query keys use `'members'` prefix. `useDisplayNameCheck` replaces `useShopNameCheck`. Hook parameter types use `MemberUpdateInput`.
**Expert Domains:** state-management

### Task 1.4: Create members store (copy onboarding store)
Copy `src/features/profiles/stores/onboarding-store.ts` to `src/features/members/stores/onboarding-store.ts`, updating only the import path from `@/features/profiles/types/onboarding` to `@/features/members/types/onboarding`. The store has no profile-specific naming.
**Files:**
- `src/features/members/stores/onboarding-store.ts` (create)
**AC:** Import path references `@/features/members/types/onboarding`. Store functionality is identical.

## Phase 2: Migrate all components and consumers to use members feature
**Goal:** Copy all components from profiles to members with updated imports, rename all consumer files (pages, navbar, banner, proxy, auth services) to import from `@/features/members/`, and update all `shop_name` references to `display_name` in component code.
**Verify:** `pnpm build`

### Task 2.1: Create members components — avatar-upload and profile-completeness
Copy `src/features/profiles/components/avatar-upload/` to `src/features/members/components/avatar-upload/` (no internal changes needed — it has no profile-specific imports besides its location). Copy `src/features/profiles/components/profile-completeness/` to `src/features/members/components/member-completeness/`, renaming the component from `ProfileCompleteness` to `MemberCompleteness`, the interface from `ProfileCompletenessProps` to `MemberCompletenessProps`, the function `computeCompleteness` parameter type from `Profile` to `Member`, the aria-label from "Profile completeness" to "Member completeness", and import type from `@/features/members/types/member`.
**Files:**
- `src/features/members/components/avatar-upload/index.tsx` (create — copy, update import of POST endpoint stays `/api/profiles/avatar` for now, will be moved in Task 2.5)
- `src/features/members/components/avatar-upload/avatar-upload.module.scss` (create — copy)
- `src/features/members/components/member-completeness/index.tsx` (create)
- `src/features/members/components/member-completeness/member-completeness.module.scss` (create — copy from profile-completeness)
**AC:** `MemberCompleteness` component accepts `{ member: Member }` prop. No `Profile` type references. Avatar upload component has no `@/features/profiles/` imports.
**Expert Domains:** nextjs

### Task 2.2: Create members account components with renamed imports
Copy all four account components from `src/features/profiles/components/account/` to `src/features/members/components/account/`. In each, update all imports to reference `@/features/members/` paths. In `personal-info/index.tsx`: change `useShopNameCheck` to `useDisplayNameCheck`, change `useUpdateProfile` to `useUpdateMember`, change `Profile` to `Member`, change all `profile.shop_name` to `member.display_name`, change prop name from `profile` to `member`, change the label text from "Shop name" to "Display name", change sr-only text from "Shop name is available/taken" to "Display name is available/taken", update `generateSlug` import to `@/features/members/services/member`. In `fishing-identity/index.tsx`: rename `Profile` to `Member`, `useUpdateProfile` to `useUpdateMember`, `profile` prop to `member`. In `notifications/index.tsx`: same pattern — `Profile` to `Member`, `useUpdateProfile` to `useUpdateMember`, prop rename. In `linked-accounts/index.tsx`: copy as-is (no profile-specific code). Copy all `.module.scss` files unchanged.
**Files:**
- `src/features/members/components/account/personal-info/index.tsx` (create)
- `src/features/members/components/account/personal-info/personal-info.module.scss` (create — copy)
- `src/features/members/components/account/fishing-identity/index.tsx` (create)
- `src/features/members/components/account/fishing-identity/fishing-identity.module.scss` (create — copy)
- `src/features/members/components/account/notifications/index.tsx` (create)
- `src/features/members/components/account/notifications/notifications.module.scss` (create — copy)
- `src/features/members/components/account/linked-accounts/index.tsx` (create — copy)
- `src/features/members/components/account/linked-accounts/linked-accounts.module.scss` (create — copy)
**AC:** No file imports from `@/features/profiles/`. No `shop_name` references. Personal info shows "Display name" label. All `Profile` types replaced with `Member`. All `useUpdateProfile` replaced with `useUpdateMember`.
**Expert Domains:** nextjs, scss

### Task 2.3: Create members onboarding components with renamed imports
Copy all onboarding components from `src/features/profiles/components/onboarding/` to `src/features/members/components/onboarding/`. In `step-display-name/index.tsx`: update `useShopNameCheck` to `useDisplayNameCheck`, update `generateSlug` import, update onboarding store import, update validation import — all to `@/features/members/` paths. In `step-bio/index.tsx`: change `useUpdateProfile`/`useCompleteOnboarding` to `useUpdateMember`/`useCompleteOnboarding` from `@/features/members/hooks/use-member`, change `shop_name: step1Data.displayName` to `display_name: step1Data.displayName`, update `generateSlug` import. In `step-fishing-identity/index.tsx`: update store and types imports. In `onboarding-wizard/index.tsx`: update all component imports and store import. In `progress-indicator/`: copy as-is (no profile-specific code). Copy all `.module.scss` files unchanged.
**Files:**
- `src/features/members/components/onboarding/onboarding-wizard/index.tsx` (create)
- `src/features/members/components/onboarding/onboarding-wizard/onboarding-wizard.module.scss` (create — copy)
- `src/features/members/components/onboarding/step-display-name/index.tsx` (create)
- `src/features/members/components/onboarding/step-display-name/step-display-name.module.scss` (create — copy)
- `src/features/members/components/onboarding/step-fishing-identity/index.tsx` (create)
- `src/features/members/components/onboarding/step-fishing-identity/step-fishing-identity.module.scss` (create — copy)
- `src/features/members/components/onboarding/step-bio/index.tsx` (create)
- `src/features/members/components/onboarding/step-bio/step-bio.module.scss` (create — copy)
- `src/features/members/components/onboarding/progress-indicator/index.tsx` (create — copy)
- `src/features/members/components/onboarding/progress-indicator/progress-indicator.module.scss` (create — copy)
**AC:** No file imports from `@/features/profiles/`. Step bio uses `display_name` not `shop_name` when building the update payload. All hooks reference `@/features/members/hooks/use-member`.
**Expert Domains:** nextjs, state-management

### Task 2.4: Update all consumer files to import from members feature
Update every file outside `src/features/members/` and `src/features/profiles/` that imports from `@/features/profiles/` to import from `@/features/members/` instead. Also update `src/features/auth/services/onboarding.ts` to query `from('members')` instead of `from('profiles')`, and update `src/proxy.ts` to query `from('members')`. Update the onboarding test to assert `mockFrom` was called with `'members'`. The `getUserProfile` function in `src/features/auth/services/auth.ts` does NOT query the profiles/members table (it calls `supabase.auth.getUser()`), so its name is an auth concern and does not need renaming in this ticket.
**Files:**
- `src/app/(frontend)/dashboard/account/page.tsx` (modify — update all imports to `@/features/members/`, change `Profile` to `Member`, `useProfile` to `useMember`, `ProfileCompleteness` to `MemberCompleteness`, update component imports for account sections)
- `src/app/(frontend)/onboarding/page.tsx` (modify — update OnboardingWizard import to `@/features/members/`)
- `src/components/navigation/navbar/index.tsx` (modify — update `useProfile` import to `useMember` from `@/features/members/hooks/use-member`, rename local variable `profile` to `member`)
- `src/components/navigation/onboarding-banner/index.tsx` (modify — update `useProfile` import to `useMember` from `@/features/members/hooks/use-member`, rename local variable)
- `src/features/auth/services/onboarding.ts` (modify — change `from('profiles')` to `from('members')`, update comment)
- `src/features/auth/services/__tests__/onboarding.test.ts` (modify — change assertion from `'profiles'` to `'members'`)
- `src/proxy.ts` (modify — change `from('profiles')` to `from('members')`, rename local `profile` variable to `member`)
**AC:** No file in `src/` (outside `src/features/profiles/`) contains `from('profiles')` or imports from `@/features/profiles/`. `pnpm build` passes. `pnpm test:run` passes.
**Expert Domains:** nextjs, supabase, state-management

## Phase 3: Remove old profiles directory, update documentation, verify clean
**Goal:** Delete `src/features/profiles/`, create `src/features/members/CLAUDE.md`, update root `CLAUDE.md`, and verify zero leftover references.
**Verify:** `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm build && pnpm test:run`

### Task 3.1: Delete the old profiles feature directory
Remove the entire `src/features/profiles/` directory. It is no longer imported by any file after Phase 2.
**Files:**
- `src/features/profiles/` (delete entire directory)
**AC:** `src/features/profiles/` does not exist. `pnpm build` passes.

### Task 3.2: Create members CLAUDE.md and update root CLAUDE.md
Create `src/features/members/CLAUDE.md` based on the old profiles CLAUDE.md but with all terminology updated: "Profiles Feature" -> "Members Feature", `Profile` -> `Member`, `ProfileUpdateInput` -> `MemberUpdateInput`, `useProfile` -> `useMember`, `useProfileBySlug` -> `useMemberBySlug`, `useUpdateProfile` -> `useUpdateMember`, `useShopNameCheck` -> `useDisplayNameCheck`, `ProfileCompleteness` -> `MemberCompleteness`, `ProfileCompletenessProps` -> `MemberCompletenessProps`, all `profiles` table references -> `members`, all `shop_name` -> `display_name`, service function names updated, file path references updated. Update root `CLAUDE.md`: change `src/features/profiles/` reference in Key Directories to `src/features/members/` with updated description, update the Storage table to reference `src/app/api/members/avatar/route.ts`, update the cascade cleanup section to reference `members` table and `members.id`.
**Files:**
- `src/features/members/CLAUDE.md` (create)
- `CLAUDE.md` (modify — update feature directory reference, storage table, cascade docs)
**AC:** No mention of `profiles` as a feature directory in either CLAUDE.md. Storage table references correct API path. Members CLAUDE.md documents all renamed types, hooks, and services accurately.

### Task 3.3: Move avatar API route from profiles to members namespace
Move `src/app/api/profiles/avatar/route.ts` to `src/app/api/members/avatar/route.ts`. Update the avatar upload component in `src/features/members/components/avatar-upload/index.tsx` to POST to `/api/members/avatar` instead of `/api/profiles/avatar`. The route handler code itself has no profiles-specific logic (it uses Supabase auth and storage only). Delete the now-empty `src/app/api/profiles/` directory.
**Files:**
- `src/app/api/members/avatar/route.ts` (create — move from profiles)
- `src/features/members/components/avatar-upload/index.tsx` (modify — update fetch URL)
- `src/app/api/profiles/` (delete entire directory)
**AC:** `src/app/api/profiles/` does not exist. Avatar upload POSTs to `/api/members/avatar`. The API route functions identically. No file in `src/` references `/api/profiles/`.
**Expert Domains:** nextjs
