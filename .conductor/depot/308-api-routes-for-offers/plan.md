# Implementation Plan: #308 — Messaging: API Routes for Offers

## Overview

2 phases, 5 total tasks
Estimated scope: small

All server-side business logic already exists in `offers-server.ts`. These API routes are thin wrappers: authenticate, parse input, call the server service, map thrown errors to HTTP status codes. The client services in `offers.ts` already point to the exact endpoints being created.

## Phase 1: Core Offer Routes (Create + Get)

**Goal:** Stand up the create and get-by-id endpoints so offers can be submitted and retrieved
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 1.1: Create the POST /api/offers route

Create the route handler for submitting a new offer. Authenticate the user, validate that `listingId`, `sellerId`, and `amountCents` are present in the request body, then delegate to `createOfferServer`. Map error messages from the server service to appropriate HTTP status codes: "Cannot make an offer on your own listing" to 400, "Listing is not active" to 400, validation errors (below 70%) to 400, "Seller does not match listing" to 400.

**Files:** `src/app/api/offers/route.ts`
**AC:**

- POST with valid `{ listingId, sellerId, amountCents }` returns 201 with the created `Offer` object
- POST without required fields returns 400 with descriptive error
- POST with `amountCents` below 70% of listing price returns 400
- POST on own listing returns 400
- POST without auth returns 401
- Description comment above the handler reads: `// Submit a new offer on a listing`
- Imports `createOfferServer` from `@/features/messaging/services/offers-server`
- Imports `AUTH_CACHE_HEADERS` from `@/libs/api-headers` and applies to all responses
- Error mapping: catch block inspects `error.message` and returns 400 for business rule violations, 500 for unexpected errors

**Expert Domains:** nextjs, supabase

### Task 1.2: Create the GET /api/offers/[id] route

Create the route handler for fetching offer details. Authenticate the user, extract the `id` param (using Next.js 16 async params pattern: `await params`), then delegate to `getOfferByIdServer`. Return 404 if the service returns null (user is not buyer or seller on the offer).

**Files:** `src/app/api/offers/[id]/route.ts`
**AC:**

- GET with valid offer ID where user is buyer or seller returns 200 with `OfferWithDetails`
- GET with valid offer ID where user is not a participant returns 404
- GET with nonexistent offer ID returns 500 (Supabase `.single()` throws)
- GET without auth returns 401
- Description comment above the handler reads: `// Get offer details including listing and participant info`
- Uses `{ params }: { params: Promise<{ id: string }> }` signature and `const { id } = await params`
- Imports `getOfferByIdServer` from `@/features/messaging/services/offers-server`
- All responses include `AUTH_CACHE_HEADERS`

**Expert Domains:** nextjs, supabase

## Phase 2: Offer Action Routes (Accept, Decline, Counter)

**Goal:** Complete the offer lifecycle with accept, decline, and counter endpoints
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 2.1: Create the POST /api/offers/[id]/accept route

Create the route handler for accepting an offer. Authenticate, extract `id` from async params, delegate to `acceptOfferServer`. Map "Only the seller can accept an offer" to 403 and "Offer is no longer pending" to 409.

**Files:** `src/app/api/offers/[id]/accept/route.ts`
**AC:**

- POST as the seller on a pending offer returns 200 with the updated `Offer` (status: `accepted`)
- POST as the buyer returns 403
- POST on a non-pending offer returns 409
- POST without auth returns 401
- Description comment: `// Accept a pending offer as the seller`
- All responses include `AUTH_CACHE_HEADERS`
- Error mapping: "Only the seller" to 403, "no longer pending" to 409, all others to 500

**Expert Domains:** nextjs, supabase

### Task 2.2: Create the POST /api/offers/[id]/decline route

Create the route handler for declining an offer. Same authentication and param extraction pattern as accept. Delegate to `declineOfferServer`. Map the same error messages: seller-only to 403, not-pending to 409.

**Files:** `src/app/api/offers/[id]/decline/route.ts`
**AC:**

- POST as the seller on a pending offer returns 200 with the updated `Offer` (status: `declined`)
- POST as the buyer returns 403
- POST on a non-pending offer returns 409
- POST without auth returns 401
- Description comment: `// Decline a pending offer as the seller`
- All responses include `AUTH_CACHE_HEADERS`
- Error mapping mirrors Task 2.1 (seller-only to 403, not-pending to 409)

**Expert Domains:** nextjs, supabase

### Task 2.3: Create the POST /api/offers/[id]/counter route

Create the route handler for countering an offer. Authenticate, extract `id`, validate that `amountCents` is present in the request body, then delegate to `counterOfferServer`. Map seller-only to 403, not-pending to 409, and validation errors (below 70%) to 400.

**Files:** `src/app/api/offers/[id]/counter/route.ts`
**AC:**

- POST as the seller with valid `{ amountCents }` returns 201 with the new counter `Offer` (has `parent_offer_id`)
- POST as the buyer returns 403
- POST on a non-pending offer returns 409
- POST with `amountCents` below 70% of listing price returns 400
- POST without `amountCents` in body returns 400
- POST without auth returns 401
- Description comment: `// Counter a pending offer with a new amount`
- All responses include `AUTH_CACHE_HEADERS`
- Error mapping: "Only the seller" to 403, "no longer pending" to 409, validation errors to 400, all others to 500

**Expert Domains:** nextjs, supabase
