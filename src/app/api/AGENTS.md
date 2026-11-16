# API Routes

## Description Comments (Required)

Every exported handler must have a description comment on the line immediately above it. The docs extractor (`scripts/docs-extract/extract-api-routes.ts`) reads these and surfaces them on the docs site for the product team.

```ts
// List all addresses for the authenticated user
export async function GET(request: NextRequest) {
```

- Write for a **product person**, not a developer
- One sentence, under 80 characters
- Focus on **what** it does, not **how**
- Good: "Send a shop invite to a new member via email"
- Bad: "POSTs to the invites table with a pending status"

If a file has multiple handlers (GET, POST, DELETE), each gets its own comment:

```ts
// Browse all published listings with optional filters
export async function GET(request: NextRequest) { ... }

// Create a new listing as a draft
export async function POST(request: NextRequest) { ... }

// Permanently remove a listing and its images
export async function DELETE(request: NextRequest) { ... }
```

## Access Contexts

The extractor auto-detects two access contexts that show as badges on the docs site:

- **Member** — any authenticated marketplace user (`createServerClient` / `createClient`)
- **Shop** — requires shop context (`requireShopPermission` from `@/libs/shop-permissions`)

Endpoints under `/api/listings/` are tagged with both since members and shop owners can both access listings.

## Conventions

- Auth via Supabase server client (cookie-based sessions)
- Shop permissions via `requireShopPermission(request, feature, level)`
- Structured error responses with appropriate HTTP status codes
- Image uploads validate MIME type, optimize with Sharp, store as WebP in Supabase Storage
