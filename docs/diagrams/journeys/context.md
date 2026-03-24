# Context Switching Flows

Member/shop identity switching, the X-Nessi-Context header, and revocation safety.

## Identity System Overview

```mermaid
flowchart TD
    A[User logs in] --> B["Default context: { type: 'member' }"]
    B --> C{User belongs to shops?}
    C -->|No| D[Only member context available]
    C -->|Yes| E[Navbar shows context switcher dropdown]

    E --> F{User selects}
    F --> G["Personal profile → switchToMember()"]
    F --> H["Shop X → switchToShop(shopId, shopName)"]

    G --> I["Zustand store: { type: 'member' }"]
    H --> J["Zustand store: { type: 'shop', shopId, shopName }"]

    I --> K["Every fetch: X-Nessi-Context: member"]
    J --> L["Every fetch: X-Nessi-Context: shop:{shopId}"]

    I & J --> M["Persisted to localStorage"]
    M --> N[Survives refresh, tab close, re-open]
```

## How Context Affects Operations

```mermaid
flowchart TD
    A{Operation} --> B[Create listing]
    A --> C[View dashboard]
    A --> D[Edit shop settings]
    A --> E[Upload assets]

    B --> F{Context?}
    F -->|Member| G["listing.member_id = user.id\nlisting.shop_id = null"]
    F -->|Shop| H["listing.member_id = null\nlisting.shop_id = shopId"]
    G --> I[Appears on /member/[slug]]
    H --> J[Appears on /shop/[slug]]

    C --> K{Context?}
    K -->|Member| L[Personal dashboard KPIs]
    K -->|Shop| M[Shop dashboard KPIs]

    D --> N{Context?}
    N -->|Member| O[No shop settings available]
    N -->|Shop| P[Shop settings based on role]

    E --> Q{Context?}
    Q -->|Member| R["Upload to members/{userId}/"]
    Q -->|Shop| S["Upload to shops/{shopId}/"]
```

## Revocation Safety Net

```mermaid
sequenceDiagram
    participant U as User (in Shop X context)
    participant API as API Route
    participant Store as Zustand Store
    participant Listener as RevocationListener
    participant Toast as Toast System

    Note over U: Owner removes user from Shop X

    U->>API: GET /api/listings/seller<br/>X-Nessi-Context: shop:X
    API->>API: Validate membership
    API-->>U: 403 Forbidden

    U->>Store: handleContextRevocation()
    Store->>Store: Check dedup (2s window)
    Store->>Store: switchToMember()
    Store->>Store: Cancel all queries
    Store->>Store: Invalidate cache

    Store->>Listener: dispatch('nessi:context-revoked')
    Listener->>Toast: "You've been removed from Shop X"
    Listener->>U: Navigate to /dashboard

    Note over U: Now in member context, safe
```

## Context on Page Load

```mermaid
flowchart TD
    A[Page loads] --> B["Zustand rehydrates from localStorage"]
    B --> C{Stored context?}
    C -->|None| D["Default: { type: 'member' }"]
    C -->|Member| E["Set context: member"]
    C -->|Shop| F["Set context: shop:{id}"]
    F --> G[First API call validates membership]
    G --> H{Still a member?}
    H -->|Yes| I[Continue in shop context]
    H -->|No| J["403 → revocation flow"]
```

## Edge Cases

```mermaid
flowchart TD
    A{Edge case} --> B["Shop deleted while user in shop context"]
    A --> C["User's role changed (owner → contributor)"]
    A --> D["User opens multiple tabs in different contexts"]
    A --> E["localStorage cleared / incognito"]

    B --> F["Next API call → 403 → revocation"]
    C --> G["API checks role on each request\nUI may show stale permissions until refresh"]
    D --> H["localStorage sync via StorageEvent\nBoth tabs update to latest context"]
    E --> I["Defaults to member context"]
```
