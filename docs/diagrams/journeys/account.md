# Account Management Flows

Profile editing, seller toggle, email change, account deletion.

## Account Settings Page

```mermaid
flowchart TD
    A["/dashboard/account"] --> B{Sections}

    B --> C["Personal Info"]
    C --> C1[Edit display name]
    C --> C2[Edit bio - 280 chars]
    C --> C3["Upload avatar (200x200 WebP)"]
    C --> C4["Change email (→ OTP flow, see auth.md)"]

    B --> D["Fishing Identity"]
    D --> D1[Select species - multi]
    D --> D2[Select technique - multi]
    D --> D3[Home state]
    D --> D4[Years fishing]

    B --> E["Notifications"]
    E --> E1["Email preferences (JSONB)"]

    B --> F["Seller Settings"]
    F --> F1["Toggle seller on/off (see seller.md)"]

    B --> G["Linked Accounts"]
    G --> G1["Stripe Connect placeholder (not built)"]

    B --> H["Danger Zone: Delete Account"]
```

## Profile Completeness

```mermaid
flowchart TD
    A[MemberCompleteness component] --> B{Check fields}
    B --> C[Has avatar?]
    B --> D[Has bio?]
    B --> E[Has fishing identity?]
    B --> F[Has display name?]

    C & D & E & F --> G[Calculate % complete]
    G --> H[Show progress bar]
    H --> I{100%?}
    I -->|No| J[Show suggestions for missing fields]
    I -->|Yes| K[Profile complete badge]
```

## Account Deletion (Full Cascade)

```mermaid
flowchart TD
    A[User clicks Delete Account] --> B["DELETE /api/auth/delete-account"]
    B --> C{Owns active shops?}

    C -->|Yes| D["409: Must transfer or delete shops first"]
    D --> E["Show shop names as links"]
    E --> F[User navigates to shop settings]
    F --> G{Resolution}
    G --> H[Transfer ownership to another member]
    G --> I[Delete shop entirely]
    H & I --> J[Retry delete account]
    J --> B

    C -->|No| K["Begin cleanup cascade"]

    K --> L{Storage cleanup - application layer}
    L --> L1["Delete member avatar (profile-assets)"]
    L --> L2["Delete listing photos (listing-images)"]
    L --> L3["Delete shop avatars (profile-assets)"]
    L --> L4["Delete shop hero banners (profile-assets)"]
    L --> L5["Delete shop listing photos (listing-images)"]

    K --> M["Delete member slug from slugs table"]

    L1 & L2 & L3 & L4 & L5 & M --> N["auth.admin.deleteUser()"]

    N --> O["CASCADE: members row deleted"]
    O --> P["BEFORE DELETE trigger: handle_member_deletion()"]
    P --> P1["Release member slug"]
    P --> P2["Release owned shop slugs"]

    O --> Q["CASCADE: all FK references cleaned up"]
    Q --> Q1[Cart items deleted]
    Q --> Q2[Recently viewed deleted]
    Q --> Q3[Shop memberships deleted]

    N --> R["Session cleared"]
    R --> S["Redirect to /"]
```

## Adding New User-Owned Resources (Dev Guide)

```mermaid
flowchart TD
    A["Adding new resource (e.g., orders, reviews, messages)"] --> B{Has FK to members.id?}
    B -->|No| C["Add FK with ON DELETE CASCADE"]
    B -->|Yes| D{Has storage objects?}

    D -->|Yes| E["Add cleanup to DELETE /api/auth/delete-account"]
    E --> F["Storage cleanup MUST be in API layer"]
    F --> G["DB triggers CANNOT call Storage API"]

    D -->|No| H{Blocking dependency?}
    H -->|Yes| I["Add 409 gate in delete-account route"]
    I --> J["Like shop ownership: must resolve first"]
    H -->|No| K[CASCADE handles it automatically]

    C --> L{Cross-references?}
    L -->|Yes| M["Decide: cascade or soft-delete"]
    M --> N["Document in feature's CLAUDE.md"]
    L -->|No| O["Test full deletion chain"]
```
