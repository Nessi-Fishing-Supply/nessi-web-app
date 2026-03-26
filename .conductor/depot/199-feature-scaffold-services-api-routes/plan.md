# Implementation Plan: #199 — Feature Scaffold, Services, API Routes, and Validation

## Overview

3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Foundation — Types, Constants, Validations

**Goal:** Establish the report feature's type system, reason constants, and Yup validation schema so downstream services and API routes have a stable contract to import.
**Verify:** `pnpm build`

### Task 1.1: Create report types

Define database-derived types for the reports feature following the pattern in `src/features/addresses/types/address.ts` and `src/features/listings/types/listing.ts`. Extract `Report` (Row), `ReportInsert` (omitting system-managed fields), `ReportReason`, `ReportTargetType`, and `ReportStatus` enum types from `Database['public']`. Define a `ReportFormData` type for the submission payload (target_type, target_id, reason, description) and a `DuplicateCheckParams` type for the duplicate check query (target_type, target_id).
**Files:** `src/features/reports/types/report.ts`
**AC:** Types compile cleanly; `ReportFormData` includes `target_type`, `target_id`, `reason`, and optional `description`; enum types match the 7 reasons, 4 target types, and 4 statuses from `database.ts`.
**Expert Domains:** supabase

### Task 1.2: Create report reason constants

Create a constants file with a `REPORT_REASONS` array following the pattern in `src/features/listings/constants/condition.ts`. Each entry has `value` (matching the `report_reason` enum), `label` (human-readable), and `description` (explains what this reason covers). The 7 reasons are: spam, prohibited_item, counterfeit, inappropriate_content, off_platform_transaction, harassment, other. Also export a `REPORT_TARGET_TYPES` array with value/label pairs for the 4 target types.
**Files:** `src/features/reports/constants/reasons.ts`
**AC:** `REPORT_REASONS` has exactly 7 entries; each has `value`, `label`, `description`; values match `Database['public']['Enums']['report_reason']`. `REPORT_TARGET_TYPES` has 4 entries with `value` and `label`.
**Expert Domains:** supabase

### Task 1.3: Create report validation schema

Create a Yup validation schema following the patterns in `src/features/addresses/validations/address.ts` and `src/features/listings/validations/listing.ts`. The `reportSchema` validates: `target_type` (required, oneOf the 4 target types), `target_id` (required, UUID format), `reason` (required, oneOf the 7 reasons), `description` (optional string, trimmed, max 1000 characters). Import enum values from the constants file for the `oneOf` checks.
**Files:** `src/features/reports/validations/report.ts`
**AC:** Schema validates all 4 fields; rejects invalid target_type or reason values; rejects description over 1000 chars; allows missing description; rejects missing required fields with user-friendly error messages.
**Expert Domains:** supabase

## Phase 2: Services — Client and Server

**Goal:** Implement the data access layer: server-side Supabase queries for creating and checking reports, and client-side fetch wrappers calling the API routes.
**Verify:** `pnpm build`

### Task 2.1: Create server-side report services

Create server services following the pattern in `src/features/addresses/services/address-server.ts`. Use `createClient` from `@/libs/supabase/server` (not admin client). Implement two functions: (1) `createReportServer(userId, data)` — inserts a report row with `reporter_id` set to `userId`, returns the created report. Catch the unique constraint violation (Postgres error code `23505`) and throw a descriptive duplicate error. (2) `getExistingReportServer(userId, targetType, targetId)` — queries for an existing report matching `reporter_id`, `target_type`, and `target_id`, returns the report or null using `maybeSingle()`.
**Files:** `src/features/reports/services/report-server.ts`
**AC:** `createReportServer` inserts a report and returns the row; throws on duplicate (unique constraint); `getExistingReportServer` returns a report or null without throwing on empty result.
**Expert Domains:** supabase

### Task 2.2: Create client-side report services

Create client services following the pattern in `src/features/addresses/services/address.ts`. Use `post` and `get` from `@/libs/fetch`. Implement two functions: (1) `submitReport(data: ReportFormData)` — POST to `/api/reports` with the form data, returns the created report. (2) `checkDuplicateReport(params: DuplicateCheckParams)` — GET to `/api/reports/check?targetType={}&targetId={}`, returns `{ exists: boolean }`.
**Files:** `src/features/reports/services/report.ts`
**AC:** `submitReport` calls POST `/api/reports`; `checkDuplicateReport` calls GET `/api/reports/check` with query params; both use typed generics from the fetch helpers.
**Expert Domains:** nextjs

## Phase 3: API Routes

**Goal:** Wire up the HTTP endpoints that the client services call, with authentication, validation, duplicate detection, and proper status codes.
**Verify:** `pnpm build`

### Task 3.1: Create POST /api/reports route

Create the API route following the pattern in `src/app/api/addresses/route.ts`. Authenticate via `supabase.auth.getUser()` — return 401 if no user. Parse request body, validate with `reportSchema` — return 400 on validation errors. Call `createReportServer(user.id, validated)`. Catch duplicate constraint errors and return 409 with `{ error: 'You have already reported this item' }`. Return 201 with the created report on success. Use `AUTH_CACHE_HEADERS` from `@/libs/api-headers`.
**Files:** `src/app/api/reports/route.ts`
**AC:** Returns 401 for unauthenticated requests; returns 400 for invalid body; returns 409 when user has already reported the same target; returns 201 with report data on success; all responses include `AUTH_CACHE_HEADERS`.
**Expert Domains:** supabase, nextjs

### Task 3.2: Create GET /api/reports/check route

Create a route handler for duplicate checking. Authenticate via `supabase.auth.getUser()` — return 401 if no user. Read `targetType` and `targetId` from URL search params — return 400 if either is missing. Call `getExistingReportServer(user.id, targetType, targetId)`. Return `{ exists: true }` if a report is found, `{ exists: false }` otherwise. Use `AUTH_CACHE_HEADERS`.
**Files:** `src/app/api/reports/check/route.ts`
**AC:** Returns 401 for unauthenticated requests; returns 400 when targetType or targetId is missing; returns `{ exists: true }` when the user has an existing report for that target; returns `{ exists: false }` otherwise.
**Expert Domains:** supabase, nextjs
