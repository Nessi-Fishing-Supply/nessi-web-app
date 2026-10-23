# Create Wizard Simplification — Design Spec

## Problem

The listing create wizard uses a "draft-first" pattern that creates a database row on page entry (before the user does anything) so that photo uploads have a `listing_id` for the storage path. This causes orphan draft rows when:

- The user visits the wizard and leaves without publishing
- React re-renders trigger duplicate draft creation
- The `reset()` call after publish clears `listingId`, causing PhotosStep to create a new draft before navigation completes

Additional issues: dual validation systems, data silently dropped on publish (`fishingHistory`, `packageDimensions`), browser history state desyncing with wizard state.

## Solution: Client-Side-First Wizard

Eliminate the draft-first pattern entirely. Hold all wizard state (including photo `File` objects) client-side until the user explicitly clicks "Publish" or "Save as Draft."

### Core Principle

**No database interaction until the user takes an explicit save action.** The wizard is a pure client-side form until publish/save.

## Architecture

### State Management

**Zustand store** (simplified — remove `listingId`, `draftId`):

```
Form fields: title, description, category, condition, priceCents,
             shippingPreference, shippingPaidBy, weightOz
Step: current wizard step number
```

**IndexedDB** (new — for `File` blobs that can't be serialized to localStorage):

```
Store: 'nessi-wizard-photos'
Key: auto-increment
Value: { file: File, position: number, previewUrl?: string }
```

**On mount:** Zustand restores form fields from localStorage. IndexedDB restores `File` objects. Wizard resumes where the user left off.

**On publish/save:** Create listing row → upload all photos → update status. One atomic flow.

**On abandon:** Nothing in the DB. IndexedDB cleaned up by browser eventually, or explicitly on next wizard entry.

### Photo Handling

**During wizard:**

- User selects files → `File` objects stored in IndexedDB
- Previews shown via `URL.createObjectURL(file)`
- Drag-to-reorder updates `position` in IndexedDB
- Delete removes from IndexedDB
- No network requests for photos during wizard

**On publish/save:**

1. Create listing row via `POST /api/listings` (returns `listing.id`)
2. Upload all photos sequentially (or 3 concurrent) to `POST /api/listings/upload` with the new `listing.id`
3. If publishing: `PATCH /api/listings/[id]/status` → `active`
4. Show progress indicator during upload phase
5. On success: clear IndexedDB + reset Zustand store, navigate to listing or dashboard
6. On failure: listing row exists as draft with partial photos — user can retry

### Draft Resume

**New listings (no `?draftId`):**

- Wizard loads from Zustand (form fields) + IndexedDB (photos)
- If both are empty, fresh wizard
- If Zustand has stale data from a previous completed listing, clear it (check: if no photos in IndexedDB, reset Zustand)

**Resuming saved drafts (`?draftId=xxx`):**

- Server loads draft + photos from DB
- Photos are already uploaded (they were uploaded during the original save)
- Wizard hydrates from server data, user continues editing
- On re-publish: update listing fields + status (photos already in storage)

### Publish Flow

```
User clicks "Publish"
  ↓
Validate ALL steps (not just current)
  ↓
Show full-screen publishing overlay with progress
  ↓
1. POST /api/listings → create listing row → get listing.id
2. For each photo File from IndexedDB:
   POST /api/listings/upload (with listing.id)
   Update progress: "Uploading photo 3 of 7..."
3. PATCH /api/listings/[id]/status → 'active'
  ↓
Clear IndexedDB + reset Zustand
  ↓
Navigate to /listing/[id]
Show success toast
```

### Save Draft Flow

```
User clicks "Save as Draft"
  ↓
Show saving overlay with progress
  ↓
1. POST /api/listings → create listing row (status: draft) → get listing.id
   OR if resuming: PUT /api/listings/[id] → update fields
2. For each NEW photo File from IndexedDB:
   POST /api/listings/upload (with listing.id)
   Update progress: "Saving photo 3 of 7..."
  ↓
Clear IndexedDB + reset Zustand
  ↓
Navigate to /dashboard/listings
Show success toast: "Draft saved"
```

## Files Changed

### New Files

- `src/libs/indexed-db.ts` — Thin IndexedDB wrapper (open, get, put, delete, clear for a store)
- `src/features/listings/stores/wizard-photo-store.ts` — IndexedDB-backed photo state (add, remove, reorder, getAll, clear)

### Modified Files

- `src/features/listings/stores/create-wizard-store.ts` — Remove `listingId`, `draftId`, `photos` fields. Photos move to IndexedDB.
- `src/features/listings/components/create-wizard/index.tsx` — New publish/save flows with progress overlay. Remove `setTimeout(reset)`. Add full-step validation before publish.
- `src/features/listings/components/create-wizard/steps/photos-step.tsx` — Remove draft creation. Use IndexedDB for photo files. Show blob previews instead of uploaded URLs.
- `src/features/listings/components/photo-manager/index.tsx` — Accept `File` objects instead of requiring `listingId`. Show blob previews. Remove incremental upload logic.
- `src/features/listings/components/create-wizard/steps/review-step.tsx` — Show blob previews for photos instead of server URLs.

### Deleted Patterns

- No more `useCreateDraft()` call in PhotosStep
- No more `draftCreatingRef` / `draftCreatedRef` guards
- No more `needsDraft` state
- No more `setTimeout(() => reset(), 500)`
- No more `resetOnEntryRef` effect
- No more eager `POST /api/listings/drafts` on wizard entry

## Validation

Single validation authority: wizard-level Yup schemas (`STEP_SCHEMAS`). Remove react-hook-form from individual steps — use controlled inputs backed by Zustand store directly. This eliminates the dual-validation disagreement issue.

Before publish: validate ALL steps, navigate to first failing step if any fail.

## Error Handling

**Upload failure during publish:**

- Listing row already created (status: draft)
- Some photos may be uploaded, some may not
- Show error with "Retry" button that re-attempts failed uploads
- If user dismisses: draft exists in DB with partial photos, can be resumed via `?draftId=`

**Browser crash during publish:**

- Same as upload failure — draft row exists, partial photos
- User can resume from dashboard

## Migration

- Delete orphan drafts from DB (status: draft, no photos or title = 'Untitled Draft')
- No schema changes needed
- API routes unchanged (they already accept the right inputs)
- The `POST /api/listings/drafts` route can remain for backward compat but won't be called by the wizard

## Out of Scope

- `fishingHistory` field (no UI input exists — remove from store)
- `packageDimensions` field (no DB column — remove from store)
- Browser history `pushState`/`popstate` refactor (separate concern)
- Competitor fee comparison (cosmetic, not broken)
