# Implementation Plan: #200 — ReportBottomSheet component and useSubmitReport hook

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Tanstack Query Hooks

**Goal:** Create the `useSubmitReport` mutation hook and `useCheckDuplicateReport` query hook that wrap the existing client services and integrate with toasts and error handling.
**Verify:** `pnpm build`

### Task 1.1: Create useCheckDuplicateReport query hook

Create a Tanstack Query hook that wraps the existing `checkDuplicateReport` client service. The hook accepts `target_type` and `target_id` params and returns `{ exists: boolean }`. It should only be enabled when both params are provided. Use a descriptive query key like `['reports', 'check', target_type, target_id]` following the pattern established in `use-listings.ts`.

**Files:** `src/features/reports/hooks/use-reports.ts`
**AC:** `useCheckDuplicateReport({ target_type, target_id })` returns a Tanstack Query result with `data.exists` boolean; query is disabled when params are missing; query key includes target identifiers for proper caching.
**Expert Domains:** state-management

### Task 1.2: Create useSubmitReport mutation hook

Create a Tanstack Query mutation hook that wraps the existing `submitReport` client service. The mutation should accept `ReportFormData` and handle three outcomes: (1) success triggers `onSuccess` callback (passed as hook arg), (2) 409 duplicate triggers `onDuplicate` callback, (3) other errors trigger `onError` callback. Detect 409 by checking `error instanceof FetchError && error.status === 409` following the pattern in `src/features/shops/components/shop-settings/shop-details-section/index.tsx`. On success, invalidate the `['reports', 'check']` query key so the duplicate check cache refreshes.

**Files:** `src/features/reports/hooks/use-reports.ts`
**AC:** `useSubmitReport({ onSuccess, onDuplicate, onError })` returns a Tanstack Query mutation; 409 errors route to `onDuplicate` callback; other errors route to `onError`; success invalidates `['reports', 'check']` queries.
**Expert Domains:** state-management

## Phase 2: ReportBottomSheet Component

**Goal:** Build the ReportBottomSheet UI component using the existing BottomSheet primitive, with a radio list of 7 report reasons, optional description textarea, character counter, and submit button.
**Verify:** `pnpm build`

### Task 2.1: Create ReportBottomSheet component skeleton with radio reason list

Create the ReportBottomSheet component that wraps the existing `BottomSheet` primitive from `src/components/layout/bottom-sheet/`. The component accepts `isOpen`, `onClose`, `targetType`, and `targetId` props. Inside the BottomSheet body, render a `<fieldset>` with `<legend>` ("Why are you reporting this {targetType}?") containing 7 radio inputs sourced from `REPORT_REASONS` constant. Each radio option shows its `label` and `description` text (matching the pattern in `src/features/listings/components/condition-selector/`). Use visually hidden native radio inputs with custom styled radio circles for keyboard accessibility. Track selected reason in local state. Do NOT use the BottomSheet `cta` prop since it lacks `disabled` support — instead render a custom submit button inside the children area, below the form content, that is `disabled` until a reason is selected.

**Files:** `src/features/reports/components/report-bottom-sheet/index.tsx`, `src/features/reports/components/report-bottom-sheet/report-bottom-sheet.module.scss`
**Reuses:** `src/components/layout/bottom-sheet/`, `src/features/reports/constants/reasons.ts`
**AC:** BottomSheet renders 7 radio options with label and description; selecting a reason updates local state; submit button is disabled when no reason is selected; fieldset and legend are present for screen reader grouping; radio inputs are keyboard navigable with visible focus indicators.
**Expert Domains:** scss, nextjs

### Task 2.2: Add optional description textarea with character counter

Add an optional description textarea below the radio list. The textarea becomes required when the "Other" reason is selected (show "(required)" indicator). Include a live character counter showing `{current}/1000` that updates on input. The counter text should change color (e.g., `--color-error-500`) when approaching or exceeding the limit. The submit button should also be disabled when "Other" is selected and description is empty. Use `aria-describedby` to link the textarea to its character counter and any validation message.

**Files:** `src/features/reports/components/report-bottom-sheet/index.tsx`, `src/features/reports/components/report-bottom-sheet/report-bottom-sheet.module.scss`
**AC:** Textarea appears below radio list; character counter displays current/max (1000); "Other" reason requires description (submit disabled without it); counter changes color near limit; textarea has `aria-describedby` linking to counter; `aria-required` is set when "Other" is selected.
**Expert Domains:** scss

### Task 2.3: Wire up form submission with useSubmitReport and toast feedback

Wire the submit button to `useSubmitReport`. On click, validate the form data against the existing `reportSchema` from `src/features/reports/validations/report.ts`, then call `submitReport.mutate()`. Show `aria-busy="true"` on the button during submission. On success: close the sheet via `onClose`, reset form state, and show a success toast via `useToast` ("Report submitted" / "Thank you for helping keep Nessi safe"). On 409 duplicate: show an error toast ("Already reported" / "You have already reported this {targetType}"). On other errors: show a generic error toast. Reset form state (selected reason, description) when the sheet closes.

**Files:** `src/features/reports/components/report-bottom-sheet/index.tsx`
**Reuses:** `src/components/indicators/toast/context.tsx` (useToast), `src/features/reports/hooks/use-reports.ts`, `src/features/reports/validations/report.ts`
**AC:** Submit calls `useSubmitReport` mutation; success closes sheet and shows success toast; 409 shows duplicate toast without closing; generic errors show error toast; button shows `aria-busy` loading state during mutation; form resets on close.
**Expert Domains:** state-management

## Phase 3: Duplicate Pre-Check and Polish

**Goal:** Add pre-check duplicate detection before opening the sheet, handle edge cases, and ensure full accessibility compliance.
**Verify:** `pnpm build`

### Task 3.1: Add useReportTarget hook for pre-check orchestration

Create a `useReportTarget` convenience hook that composes `useCheckDuplicateReport` and local open/close state. The hook accepts `target_type` and `target_id` and returns `{ openReportSheet, isOpen, close, isDuplicate, isChecking }`. When `openReportSheet()` is called, it checks the duplicate query result: if `exists` is true, it shows a toast ("Already reported" / "You have already reported this {targetType}") and does NOT open the sheet; if `exists` is false, it opens the sheet. The duplicate check query should be enabled whenever `target_type` and `target_id` are provided (pre-fetching), so the check is instant when the user taps "Report".

**Files:** `src/features/reports/hooks/use-report-target.ts`
**Reuses:** `src/features/reports/hooks/use-reports.ts`, `src/components/indicators/toast/context.tsx`
**AC:** `useReportTarget({ target_type, target_id })` returns open/close state and pre-check logic; calling `openReportSheet()` when duplicate exists shows toast and does not open sheet; calling it when no duplicate opens the sheet; duplicate check query is pre-fetched.
**Expert Domains:** state-management

### Task 3.2: Export reports feature public API

Create a barrel export file for the reports feature that exports the ReportBottomSheet component and the useReportTarget hook. These are the two public-facing pieces that consuming features (listings, members, shops) will import.

**Files:** `src/features/reports/index.ts`
**AC:** `import { ReportBottomSheet, useReportTarget } from '@/features/reports'` works; exports are correctly typed.

### Task 3.3: Update reports feature CLAUDE.md

Update the reports feature CLAUDE.md to document the new hooks (`useCheckDuplicateReport`, `useSubmitReport`, `useReportTarget`), the ReportBottomSheet component (props, behavior, accessibility), and the public API surface. Add entries to the Architecture, Key Patterns, and Future Work sections.

**Files:** `src/features/reports/CLAUDE.md`
**AC:** CLAUDE.md documents all new hooks with their query keys and parameters; documents ReportBottomSheet props and behavior; documents the public API exports; documents the duplicate pre-check flow.
