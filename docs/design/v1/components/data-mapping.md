# Data Mapping Report -- Nessi Design System v1

Source: `https://0m34aamgen-7200.hosted.obvious.ai/design-system.html`
Generated: 2026-03-23

## Existing Data Layers

### Services (query/mutation functions)

- `src/features/auth/services/auth.ts` -- authentication
- `src/features/auth/services/onboarding.ts` -- onboarding flow
- `src/features/listings/services/listing.ts` -- listing CRUD (browser client)
- `src/features/listings/services/listing-server.ts` -- listing reads (server client)
- `src/features/listings/services/listing-photo.ts` -- photo upload
- `src/features/listings/services/search.ts` -- search/filter
- `src/features/members/services/member.ts` -- member profile (browser client)
- `src/features/members/services/member-server.ts` -- member reads (server client)
- `src/features/members/services/seller.ts` -- seller profile data
- `src/features/shops/services/shop.ts` -- shop CRUD (browser client)
- `src/features/shops/services/shop-server.ts` -- shop reads (server client)

### Hooks (Tanstack Query wrappers)

- `src/features/listings/hooks/use-listings.ts` -- listing queries
- `src/features/listings/hooks/use-listings-infinite.ts` -- infinite scroll queries
- `src/features/listings/hooks/use-listing-photos.ts` -- photo management
- `src/features/listings/hooks/use-search.ts` -- search queries
- `src/features/listings/hooks/use-search-filters.ts` -- filter state
- `src/features/listings/hooks/use-autocomplete.ts` -- search autocomplete
- `src/features/listings/hooks/use-debounced-value.ts` -- debounce utility
- `src/features/members/hooks/use-member.ts` -- member profile queries
- `src/features/members/hooks/use-seller.ts` -- seller data queries
- `src/features/shops/hooks/use-shops.ts` -- shop queries

---

## Component Data Wiring Analysis

### Live Data Wired (hook/service exists for data)

| Component               | Data Source             | Hook/Service                         | Import Path                                       |
| ----------------------- | ----------------------- | ------------------------------------ | ------------------------------------------------- |
| Product Card            | Listing data            | `useListings`, `useListingsInfinite` | `@/features/listings/hooks/use-listings`          |
| Seller Card             | Member/seller data      | `useMember`, `useSeller`             | `@/features/members/hooks/use-member`             |
| Listing Performance Row | Listing data            | `useListings`                        | `@/features/listings/hooks/use-listings`          |
| Photo Upload            | Photo upload service    | `useListingPhotos`                   | `@/features/listings/hooks/use-listing-photos`    |
| Search Input            | Search/autocomplete     | `useSearch`, `useAutocomplete`       | `@/features/listings/hooks/use-search`            |
| Filter Panel            | Filter state            | `useSearchFilters`                   | `@/features/listings/hooks/use-search-filters`    |
| Pagination              | Infinite scroll         | `useListingsInfinite`                | `@/features/listings/hooks/use-listings-infinite` |
| Avatar                  | Member/shop data        | `useMember`                          | `@/features/members/hooks/use-member`             |
| Rating Display          | Seller data             | `useSeller`                          | `@/features/members/hooks/use-seller`             |
| Watchlist Toggle        | Listing favorites       | `useListings` (partial)              | `@/features/listings/hooks/use-listings`          |
| Condition Track         | Listing condition       | listing types                        | `@/features/listings/types/`                      |
| Fishing Identity Tag    | Member fishing identity | `useMember`                          | `@/features/members/hooks/use-member`             |
| Shop Highlight          | Shop data               | `useShops`                           | `@/features/shops/hooks/use-shops`                |

### Typed Props Only (no existing data layer)

| Component             | Props Required                                                                                                                                   | Future Service Needed                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Tooltip               | `content: string; children: ReactNode; placement?: 'top' \| 'bottom'`                                                                            | None (pure UI)                        |
| Date Time Display     | `date: string \| Date; format: 'relative' \| 'absolute' \| 'countdown'`                                                                          | None (pure formatting)                |
| Location Chip         | `location: string; variant: 'inline' \| 'pill' \| 'pickup'`                                                                                      | None (pure display)                   |
| Divider (labeled)     | `label?: string; direction?: 'horizontal' \| 'vertical'`                                                                                         | None (pure UI)                        |
| Member Badge          | `name: string; icon: string; earned: boolean`                                                                                                    | `members/services/badges.ts`          |
| Tabs                  | `items: TabItem[]; activeIndex: number; onChange: (i) => void`                                                                                   | None (pure UI)                        |
| Page Header           | `title?: string; onBack: () => void; actions?: ReactNode`                                                                                        | None (pure UI)                        |
| Progress Bar          | `value: number; max: number; label?: string`                                                                                                     | None (pure UI)                        |
| Inline Banner         | `variant: 'warning' \| 'error' \| 'info' \| 'success'; title: string; description?: string; action?: { label: string; onClick: () => void }`     | None (pure UI)                        |
| Price Display         | `price: number; originalPrice?: number; watcherCount?: number; belowAvg?: string`                                                                | `listings/services/pricing.ts`        |
| Fee Calculator        | `price: number; feeRate: number; isShop: boolean`                                                                                                | `listings/services/pricing.ts`        |
| Spec Table            | `specs: { key: string; value: string }[]`                                                                                                        | listing types                         |
| Message Thread        | `messages: Message[]; currentUserId: string`                                                                                                     | `messaging/services/messaging.ts`     |
| Offer Bubble          | `amount: number; originalPrice: number; expiresAt: Date; status: 'pending' \| 'accepted' \| 'declined'`                                          | `messaging/services/offers.ts`        |
| Shipping Rate Card    | `carrier: string; service: string; price: number; eta: string; isSelected: boolean`                                                              | `orders/services/shipping.ts`         |
| Order Timeline        | `steps: TimelineStep[]; currentStep: number`                                                                                                     | `orders/services/orders.ts`           |
| Category Tile         | `name: string; image: string; href: string`                                                                                                      | listing categories                    |
| Quantity Stepper      | `value: number; min?: number; max?: number; onChange: (n) => void`                                                                               | None (pure UI)                        |
| Notification Row      | `type: string; title: string; description: string; timestamp: Date; isRead: boolean`                                                             | `notifications/services/`             |
| Settings Row          | `label: string; value?: string; type: 'toggle' \| 'nav' \| 'display'`                                                                            | None (pure UI)                        |
| Verification Badge    | `type: string; label: string; variant: 'success' \| 'green' \| 'orange' \| 'maroon' \| 'neutral'`                                                | `members/services/badges.ts`          |
| Trust Stat Row        | `stats: { label: string; value: string }[]; sellerName: string; rating: number; salesCount: number`                                              | `members/services/seller.ts` (exists) |
| Offer UI              | `amount: number; originalPrice: number; expiresAt: Date; status: string`                                                                         | `messaging/services/offers.ts`        |
| KPI Stat Tile         | `label: string; value: string; trend: { direction: 'up' \| 'down' \| 'flat'; value: string; period: string }`                                    | `dashboard/services/analytics.ts`     |
| Quick Action Card     | `icon: ReactNode; label: string; badge?: number; subtitle?: string; href: string`                                                                | None (pure UI)                        |
| Sparkline             | `data: number[]; color?: string`                                                                                                                 | `dashboard/services/analytics.ts`     |
| Shop Upgrade Prompt   | `listingCount: number; totalSales: number`                                                                                                       | `shops/services/shop.ts` (exists)     |
| Maker Story Block     | `quote: string; author: string; shopName: string; image: string; narrative: string; ctaLabel: string; ctaHref: string`                           | `editorial/services/`                 |
| Featured Listing Card | `listing: Listing; isFeatured: boolean; sellerName: string`                                                                                      | `editorial/services/`                 |
| Species Browse Row    | `species: { name: string; icon: string; isActive: boolean }[]`                                                                                   | listing categories                    |
| Social Proof Strip    | `stats: { label: string; value: string }[]; activity?: { userName: string; location: string; itemName: string; price: number; timeAgo: string }` | `editorial/services/`                 |
| Price Drop Alert      | `itemName: string; oldPrice: number; newPrice: number; thumbnail?: string`                                                                       | `listings/services/` (extends)        |
| Recently Sold Ticker  | `sales: { title: string; price: number; thumbnail: string; timeAgo: string }[]`                                                                  | `editorial/services/`                 |
| Bottom Sheet          | `title: string; children: ReactNode; isOpen: boolean; onClose: () => void`                                                                       | None (pure UI)                        |
| Error State           | `variant: 'inline' \| 'banner' \| '404'; message: string; action?: { label: string; onClick: () => void }`                                       | None (pure UI)                        |

---

## Future Service Gaps

These services do not exist yet and would be needed for full data wiring:

| Service       | Path                                                   | Components Needing It                                                      |
| ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Messaging     | `src/features/messaging/services/messaging.ts`         | Message Thread, Offer Bubble                                               |
| Offers        | `src/features/messaging/services/offers.ts`            | Offer UI, Offer Bubble                                                     |
| Orders        | `src/features/orders/services/orders.ts`               | Order Timeline                                                             |
| Shipping      | `src/features/orders/services/shipping.ts`             | Shipping Rate Card                                                         |
| Analytics     | `src/features/dashboard/services/analytics.ts`         | KPI Stat Tile, Sparkline                                                   |
| Badges        | `src/features/members/services/badges.ts`              | Member Badge, Verification Badge                                           |
| Editorial     | `src/features/editorial/services/editorial.ts`         | Shop Highlight, Maker Story, Featured Listing, Social Proof, Recently Sold |
| Notifications | `src/features/notifications/services/notifications.ts` | Notification Row                                                           |
| Pricing       | `src/features/listings/services/pricing.ts`            | Price Display, Fee Calculator                                              |
