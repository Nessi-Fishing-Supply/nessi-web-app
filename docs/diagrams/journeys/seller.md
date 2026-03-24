# Seller Flows

Listing lifecycle: create, edit, publish, manage, sold, archive, duplicate, delete.

## Listing Lifecycle (State Machine)

```mermaid
stateDiagram-v2
    [*] --> draft: POST /api/listings (create empty draft)

    draft --> active: PATCH status=active\n(publish, sets published_at)
    draft --> DELETED: DELETE /api/listings/drafts\n(hard delete, draft only)

    active --> sold: PATCH status=sold\n(sets sold_at)
    active --> archived: PATCH status=archived\n(hide from search)

    archived --> active: PATCH status=active\n(un-archive)

    sold --> [*]: Final state

    note right of draft
        Requires 2+ photos to publish.
        localStorage persistence for create wizard.
    end note

    note right of active
        Visible in search, browse, shop page.
        Editable until sold.
        View count tracked.
    end note

    note right of archived
        Hidden from search.
        Kept for history.
        Can be reactivated.
    end note
```

## Create Listing (5-Step Wizard)

```mermaid
flowchart TD
    A["Seller clicks 'New Listing'"] --> B["POST /api/listings/drafts → empty draft created"]
    B --> C["Redirect to /dashboard/listings/new"]

    C --> D["Step 1: Photos"]
    D --> E["Upload via POST /api/listings/upload"]
    E --> F["Sharp: resize 1200x1200 max + 400x400 thumb"]
    F --> G["Stored as WebP in listing-images bucket"]
    G --> H{2+ photos uploaded?}
    H -->|No| I[Cannot proceed to next step]
    H -->|Yes| J["Step 2: Category + Condition"]

    J --> K["Select from 10 categories"]
    K --> L["Select condition (6 tiers)"]
    L --> M["Step 3: Details"]

    M --> N[Title, brand, description]
    N --> O[Species, state, listing type]
    O --> P["Step 4: Pricing + Shipping"]

    P --> Q[Price in dollars, stored as cents]
    Q --> R[Shipping options + rates]
    R --> S["Step 5: Review"]

    S --> T{Action}
    T -->|Save as draft| U[PUT /api/listings/[id] with current fields]
    T -->|Publish| V["PUT listing + PATCH status=active"]
    V --> W["published_at set, visible in search"]

    X[Wizard state] --> Y[Zustand store with localStorage persistence]
    Y --> Z[Survives page refresh / navigation]
```

## Edit Listing

```mermaid
flowchart TD
    A["Seller clicks Edit on listing"] --> B["/dashboard/listings/[id]/edit"]
    B --> C["GET /api/listings/[id] → pre-populate wizard"]
    C --> D[Same 5-step wizard as create]
    D --> E[Tracks changedFields for partial save]
    E --> F{Save}
    F --> G["PUT /api/listings/[id] with only changed fields"]
    G --> H[No localStorage persistence for edit]

    I[Photo management during edit] --> J[Add new photos]
    I --> K["Delete photos (DELETE /api/listings/upload/delete)"]
    K --> L[Remaining photos re-sequenced]
```

## Dashboard Listing Management

```mermaid
flowchart TD
    A["/dashboard/listings"] --> B["GET /api/listings/seller"]
    B --> C[All listings, all statuses]
    C --> D{Filter by tab}
    D --> E[Active listings]
    D --> F[Drafts]
    D --> G[Sold]
    D --> H[Archived]

    E --> I{Actions menu}
    I --> J[Edit → edit wizard]
    I --> K["Mark Sold → modal confirm → PATCH status=sold"]
    I --> L["Archive → PATCH status=archived"]
    I --> M["Quick Edit Price → inline price update"]
    I --> N["Duplicate → POST /api/listings/[id]/duplicate"]
    N --> O[New draft created with copied fields]
    O --> P[Opens at Step 1 - needs photos]

    F --> Q{Draft actions}
    Q --> R[Continue editing → create wizard]
    Q --> S["Delete draft → DELETE /api/listings/drafts (hard delete)"]

    H --> T{Archived actions}
    T --> U["Reactivate → PATCH status=active"]
```

## Seller Context (Member vs Shop)

```mermaid
flowchart TD
    A[Seller creates listing] --> B{Active context?}
    B -->|Member context| C["seller_id = user.id\nmember_id = user.id\nshop_id = null"]
    B -->|Shop context| D["seller_id = user.id\nmember_id = null\nshop_id = activeShopId"]

    E["X-Nessi-Context header sent"] --> F{Value}
    F -->|"member"| G[API validates: user owns listing]
    F -->|"shop:{id}"| H[API validates: user is member of shop]

    C --> I[Listing appears on member's public profile]
    D --> J[Listing appears on shop's public page]
```

## Seller Toggle

```mermaid
flowchart TD
    A["User in /dashboard/account → Seller Settings"] --> B{Currently a seller?}

    B -->|No| C["Toggle ON → POST /api/members/toggle-seller (is_seller=true)"]
    C --> D[Dashboard shows seller features]

    B -->|Yes| E["Click toggle OFF"]
    E --> F["GET /api/members/seller-preconditions"]
    F --> G{Has active listings or orders?}
    G -->|Yes| H["Show warning: X active listings, Y orders"]
    H --> I[Must resolve before toggling off]
    G -->|No| J["POST /api/members/toggle-seller (is_seller=false)"]
    J --> K[All listings hidden from search]
    K --> L[Seller features hidden in dashboard]
```
