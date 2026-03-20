# Implementation Plan: #18 — Account page rebuild

## Overview
3 phases, 14 total tasks
Estimated scope: large

## Phase 1: Reusable Primitives
**Goal:** Create the three reusable UI components (inline-edit, collapsible-card, profile-completeness) that all account sections depend on.
**Verify:** `pnpm build`

### Task 1.1: Create inline-edit component
Build a reusable inline-edit component at `src/features/profiles/components/inline-edit/`. The component displays a value as read-only text; clicking it transitions to an input (text or textarea). Enter or clicking the checkmark icon saves; Escape cancels and restores the original value. It accepts `value`, `onSave`, `maxLength`, `multiline`, `placeholder`, and `validating` props. The `onSave` callback returns a Promise so the component can show a brief saving state. Keyboard support is mandatory: Enter saves (for single-line; Shift+Enter for newline in multiline), Escape cancels. Focus must move to the input when edit mode activates.
**Files:**
- `src/features/profiles/components/inline-edit/index.tsx`
- `src/features/profiles/components/inline-edit/inline-edit.module.scss`
**Expert Domains:** scss
**AC:**
- Clicking the displayed value enters edit mode with the input focused
- Enter key (single-line) or checkmark button calls `onSave` with the new value
- Escape key cancels edit mode and restores original value
- `maxLength` prop enforces character limit with a visible counter (for multiline/textarea variant)
- Component renders `aria-label` on the input and shows a visual edit icon (pencil) on hover/focus of the read-only value
- Mobile tap target is at least 44x44px
- All styles use CSS custom property tokens, mobile-first with `@include breakpoint()`

### Task 1.2: Create collapsible-card component
Build a reusable collapsible card component at `src/features/profiles/components/collapsible-card/`. It renders a header with a title and a chevron icon that rotates 180 degrees when expanded. The body content is revealed/hidden with a smooth CSS height transition. Props: `title`, `defaultExpanded`, `children`. The header button has `aria-expanded` and `aria-controls` pointing to the content panel which has `role="region"` and `aria-labelledby` referencing the header. Uses `useId()` for unique IDs.
**Files:**
- `src/features/profiles/components/collapsible-card/index.tsx`
- `src/features/profiles/components/collapsible-card/collapsible-card.module.scss`
**Expert Domains:** scss
**AC:**
- Clicking the header toggles the body visibility
- Chevron icon rotates 180 degrees on expand with CSS transition
- `aria-expanded` on the toggle button reflects current state
- Content panel has `role="region"` and `aria-labelledby`
- `defaultExpanded` prop controls initial state (defaults to `false`)
- Height transition is smooth (not display:none jump)
- Styles are mobile-first, card has `var(--shadow-1)` elevation and `var(--radius-md)` border radius

### Task 1.3: Create profile-completeness component
Build a profile completeness indicator at `src/features/profiles/components/profile-completeness/`. It accepts the `Profile` object and computes a percentage based on 5 fields: avatar_url (20%), bio (20%), primary_species length > 0 (20%), primary_technique length > 0 (20%), home_state (20%). Renders a thin (4px) progress bar with green fill and a percentage label. The entire component is hidden when completeness reaches 100%.
**Files:**
- `src/features/profiles/components/profile-completeness/index.tsx`
- `src/features/profiles/components/profile-completeness/profile-completeness.module.scss`
**Expert Domains:** scss
**AC:**
- Displays correct percentage based on the 5 profile fields
- Progress bar is 4px tall with `var(--color-success-500)` fill
- Percentage text displays next to or above the bar (e.g., "60% complete")
- Component returns `null` when profile is 100% complete
- Uses `Profile` type from `@/features/profiles/types/profile`
- Progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

## Phase 2: Account Section Components
**Goal:** Create the four section components that display and edit profile data within collapsible cards.
**Verify:** `pnpm build`

### Task 2.1: Create personal-info-section component
Build the personal info section at `src/features/profiles/components/account/personal-info-section/`. It displays the user's avatar (reusing `AvatarUpload` from `src/features/profiles/components/avatar-upload/`), display name (inline-edit with async uniqueness check via `useDisplayNameCheck`), and bio (inline-edit, textarea variant, 280 char max). Wrapped in a `CollapsibleCard` with `defaultExpanded={true}`. On display name save, calls `useUpdateProfile` with `{ display_name, slug }` (regenerate slug via `generateSlug`). On bio save, calls `useUpdateProfile` with `{ bio }`. On avatar upload, calls `useUpdateProfile` with `{ avatar_url }`. Each successful save triggers a "Saved" toast via `useToast`. The display name inline-edit must show availability status (checkmark/X icon) while typing, and block save if the name is taken (unless it matches the current name).
**Files:**
- `src/features/profiles/components/account/personal-info-section/index.tsx`
- `src/features/profiles/components/account/personal-info-section/personal-info-section.module.scss`
**Expert Domains:** supabase, scss
**AC:**
- Avatar displays using `AvatarUpload` with current `avatar_url` and `display_name`
- Avatar upload calls `useUpdateProfile` and shows "Saved" toast on success
- Display name shows inline-edit with real-time availability check (debounced via `useDisplayNameCheck`)
- Display name save is blocked when the name is already taken (not the user's own current name)
- Bio shows inline-edit textarea variant with 280 character counter
- Each save calls `useUpdateProfile` mutation and shows `{ message: 'Saved', type: 'success', duration: 2000 }` toast
- Component receives `profile` and `userId` as props (does not call `useProfile` itself)

### Task 2.2: Create fishing-identity-section component
Build the fishing identity section at `src/features/profiles/components/account/fishing-identity-section/`. Uses `CollapsibleCard` (collapsed by default). Displays species pills (reusing `PillSelector` with `SPECIES_OPTIONS`), technique pills (reusing `PillSelector` with `TECHNIQUE_OPTIONS`), home state dropdown, and years fishing inline-edit (numeric input). Pills save immediately on toggle via `useUpdateProfile`. Home state saves on dropdown change. Years fishing saves via inline-edit. Each save shows "Saved" toast. On desktop (md+), the two pill selectors render in a 2-column grid.
**Files:**
- `src/features/profiles/components/account/fishing-identity-section/index.tsx`
- `src/features/profiles/components/account/fishing-identity-section/fishing-identity-section.module.scss`
**Expert Domains:** supabase, scss
**AC:**
- Species pills render with current `primary_species` from profile, toggling a pill immediately saves via `useUpdateProfile`
- Technique pills render with current `primary_technique` from profile, toggling a pill immediately saves
- Home state renders as a `<select>` with `US_STATES` options, changing saves immediately
- Years fishing renders as inline-edit (number input), saving updates `years_fishing`
- Each save triggers "Saved" toast with 2s duration
- Mobile: single column. Desktop (md+): 2-column grid for the two pill groups
- Component receives `profile` and `userId` as props

### Task 2.3: Create notifications-section component
Build the notifications section at `src/features/profiles/components/account/notifications-section/`. Uses `CollapsibleCard` (collapsed by default). Renders 4 toggle switches for email notification preferences stored in the `notification_preferences` JSONB column. Each toggle is an `<input type="checkbox" role="switch">` with `aria-checked`. Toggling saves immediately by merging the updated preference into the existing JSONB object via `useUpdateProfile`. The 4 toggles are: marketing emails, order updates, listing activity, and community messages. Shows "Saved" toast after each toggle.
**Files:**
- `src/features/profiles/components/account/notifications-section/index.tsx`
- `src/features/profiles/components/account/notifications-section/notifications-section.module.scss`
**Expert Domains:** supabase, scss
**AC:**
- Renders 4 labeled toggle switches with `<input type="checkbox" role="switch">`
- Each toggle has `aria-checked` reflecting current state
- Toggling a switch immediately calls `useUpdateProfile` with merged `notification_preferences`
- "Saved" toast appears after each successful toggle
- Toggles are styled as pill/track switches (not raw checkboxes), minimum 44x44px tap target
- Component receives `profile` and `userId` as props

### Task 2.4: Create linked-accounts-section component
Build the linked accounts section at `src/features/profiles/components/account/linked-accounts-section/`. Uses `CollapsibleCard` (collapsed by default). Shows a Stripe Connect row with status "Not connected" and a disabled "Connect" `Button`. This is a placeholder -- no Stripe functionality is implemented. The section should be structured so real Stripe integration can replace the placeholder later.
**Files:**
- `src/features/profiles/components/account/linked-accounts-section/index.tsx`
- `src/features/profiles/components/account/linked-accounts-section/linked-accounts-section.module.scss`
**Expert Domains:** scss
**AC:**
- Renders inside a `CollapsibleCard` with title "Linked Accounts", collapsed by default
- Shows a row with Stripe logo/icon, "Stripe Connect" label, "Not connected" status text, and a disabled `Button` labeled "Connect"
- Button uses the existing `Button` component with `disabled={true}`
- No actual Stripe API calls or navigation
- Layout is clean and extensible for future integrations

## Phase 3: Page Assembly and Integration
**Goal:** Wire all section components into the rebuilt account page with full styling, loading/error states, and the existing logout + delete account functionality.
**Verify:** `pnpm build`

### Task 3.1: Rebuild account page component
Rewrite `src/app/(frontend)/dashboard/account/page.tsx` as a `'use client'` component. It calls `useAuth()` to get the user, then `useProfile(user.id)` to load the profile. Renders: page title, `ProfileCompleteness` bar, then the four section components (`PersonalInfoSection`, `FishingIdentitySection`, `NotificationsSection`, `LinkedAccountsSection`) each receiving `profile` and `userId` props. Below the sections, renders the existing logout button and danger zone (delete account) with the existing modal logic preserved. Shows a loading skeleton while profile is fetching, and an error state if the query fails.
**Files:**
- `src/app/(frontend)/dashboard/account/page.tsx`
**Expert Domains:** nextjs, supabase
**AC:**
- Page calls `useProfile(user.id)` and passes the loaded profile to all section components
- `ProfileCompleteness` bar renders between the title and first section
- All four sections render in order: Personal Info, Fishing Identity, Notifications, Linked Accounts
- Loading state shows while profile is fetching (skeleton or spinner)
- Error state shows if profile query fails
- Logout button works (redirects to `/`)
- Delete account modal and functionality preserved from current implementation
- Page is a `'use client'` component

### Task 3.2: Write account page SCSS
Rewrite `src/app/(frontend)/dashboard/account/account.module.scss` with full mobile-first styling. The page layout is a single column with max-width constraint. Sections stack vertically with consistent gap. The danger zone section retains its current styling (red border, error colors). Add responsive adjustments at `md` breakpoint for wider content area.
**Files:**
- `src/app/(frontend)/dashboard/account/account.module.scss`
**Expert Domains:** scss
**AC:**
- Mobile: single column, full-width sections with `var(--space-md)` gap
- Page has `max-width: 720px` to constrain content on wide screens
- Danger zone styles preserved (red border-top, error color heading)
- Delete modal styles preserved
- Logout button styled consistently with the page design
- All spacing uses `var(--space-*)` tokens, all colors use `var(--color-*)` tokens
- Uses `@include breakpoint(md)` for tablet+ adjustments

### Task 3.3: Update profiles feature CLAUDE.md
Update `src/features/profiles/CLAUDE.md` to document the new account section components, inline-edit, collapsible-card, and profile-completeness components. Add an "Account Components" section describing the purpose and props of each new component and how they relate to the account page.
**Files:**
- `src/features/profiles/CLAUDE.md`
**Expert Domains:** nextjs
**AC:**
- Documents all new components with their purpose and key props
- Documents the inline-edit and collapsible-card as reusable primitives within the profiles feature
- Documents the profile completeness calculation formula
- Mentions which existing components are reused (AvatarUpload, PillSelector, Button)
