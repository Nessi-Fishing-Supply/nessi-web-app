# Shop Member Flows

Role-based access for shop members: owner, manager, contributor.

## Role Permissions Matrix

```mermaid
block-beta
    columns 4
    block:header:4
        H1["Permission"] H2["Owner"] H3["Manager"] H4["Contributor"]
    end
    block:row1:4
        R1A["Create listings for shop"] R1B["Yes"] R1C["Yes"] R1D["Yes"]
    end
    block:row2:4
        R2A["Edit own listings"] R2B["Yes"] R2C["Yes"] R2D["Yes"]
    end
    block:row3:4
        R3A["Edit any shop listing"] R3B["Yes"] R3C["Yes"] R3D["NO"]
    end
    block:row4:4
        R4A["Manage shop members"] R4B["Yes"] R4C["Yes"] R4D["NO"]
    end
    block:row5:4
        R5A["Edit shop settings"] R5B["Yes"] R5C["Yes"] R5D["NO"]
    end
    block:row6:4
        R6A["Upload hero/avatar"] R6B["Yes"] R6C["Yes"] R6D["NO"]
    end
    block:row7:4
        R7A["Transfer ownership"] R7B["Yes"] R7C["NO"] R7D["NO"]
    end
    block:row8:4
        R8A["Delete shop"] R8B["Yes"] R8C["NO"] R8D["NO"]
    end

    style R1B fill:#c8e6c9
    style R1C fill:#c8e6c9
    style R1D fill:#c8e6c9
    style R2B fill:#c8e6c9
    style R2C fill:#c8e6c9
    style R2D fill:#c8e6c9
    style R3B fill:#c8e6c9
    style R3C fill:#c8e6c9
    style R3D fill:#ffcdd2
    style R4B fill:#c8e6c9
    style R4C fill:#c8e6c9
    style R4D fill:#ffcdd2
    style R5B fill:#c8e6c9
    style R5C fill:#c8e6c9
    style R5D fill:#ffcdd2
    style R6B fill:#c8e6c9
    style R6C fill:#c8e6c9
    style R6D fill:#ffcdd2
    style R7B fill:#c8e6c9
    style R7C fill:#ffcdd2
    style R7D fill:#ffcdd2
    style R8B fill:#c8e6c9
    style R8C fill:#ffcdd2
    style R8D fill:#ffcdd2
```

> **STATUS: Permission enforcement is NOT YET BUILT.** The role structure exists in the DB (shop_roles table with deterministic UUIDs), but UI gating and API-level checks are pending.

## Invite Acceptance Flow

```mermaid
flowchart TD
    A[User receives invite email] --> B["Clicks link → /invite/{token}"]
    B --> C{Authenticated?}
    C -->|No| D["Sign in via navbar modal (?login=true)"]
    D --> E[Page re-renders with Accept button]
    C -->|Yes| E
    E --> F{Invite still valid?}
    F -->|Expired| G["Show 'Invitation Expired' message"]
    F -->|Revoked| H["Show 'Invitation Revoked' message"]
    F -->|Already accepted| I["Show 'Already Accepted' message"]
    F -->|Pending + not expired| J["Click 'Accept Invitation'"]
    J --> K["POST /api/invites/{token}/accept"]
    K --> L{Validation}
    L -->|Already a member| M[409 ALREADY_MEMBER]
    L -->|Shop at member cap| N[409 MEMBER_LIMIT_REACHED]
    L -->|Member at 5-shop limit| O[409 SHOP_LIMIT_REACHED]
    L -->|All clear| P["Insert shop_members row with invite's role_id"]
    P --> Q["Update shop_invites status = 'accepted'"]
    Q --> R[Redirect to /dashboard + success toast]
    R --> S[Member sees shop in navbar dropdown]
```

## Shop Member Journey

```mermaid
flowchart TD
    A[Member joins shop via invite acceptance] --> B["Member clicks shop name → switchToShop(shopId)"]
    B --> C["X-Nessi-Context: shop:{shopId}"]

    C --> D{What can they do?}

    D --> E[Create listing in shop context]
    E --> F["Listing created with shop_id, visible on shop page"]

    D --> G{Role?}
    G -->|Owner/Manager| H[Access shop settings]
    G -->|Owner/Manager| I[Manage other members]
    G -->|Owner/Manager| J[Edit any shop listing]
    G -->|Owner only| K[Transfer ownership]
    G -->|Owner only| L[Delete shop]
    G -->|Contributor| M[Edit own listings only]
    G -->|Contributor| N[No access to settings/members]

    O[Switch back to personal] --> P["switchToMember()"]
    P --> Q["X-Nessi-Context: member"]
    Q --> R[Listings now under personal profile]
```

## Context Revocation

```mermaid
flowchart TD
    A[Member is in shop context] --> B[Owner removes member from shop]
    B --> C["DELETE /api/shops/[id]/members/[memberId]"]
    C --> D[Member's next API call includes shop context]
    D --> E["API returns 403"]
    E --> F["handleContextRevocation() fires"]
    F --> G{Dedup check: handled in last 2s?}
    G -->|Yes| H[Skip - already handling]
    G -->|No| I["switchToMember()"]
    I --> J[Cancel all queries]
    J --> K[Invalidate cache]
    K --> L["Dispatch 'nessi:context-revoked' event"]
    L --> M[ContextRevocationListener catches event]
    M --> N[Toast: You've been removed from shop]
    N --> O["Navigate to /dashboard"]
```

## Multi-Shop Member

```mermaid
flowchart TD
    A[User belongs to multiple shops] --> B["getShopsByMember(memberId)"]
    B --> C[Navbar dropdown lists all shops]
    C --> D{Select identity}
    D --> E[Personal profile]
    D --> F[Shop A - as manager]
    D --> G[Shop B - as contributor]
    D --> H[Shop C - as owner]

    E --> I["Context: { type: 'member' }"]
    F --> J["Context: { type: 'shop', shopId: A }"]
    G --> K["Context: { type: 'shop', shopId: B }"]
    H --> L["Context: { type: 'shop', shopId: C }"]

    I & J & K & L --> M[Persisted to localStorage]
    M --> N[Survives page refresh]
```
