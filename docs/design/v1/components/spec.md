# Component Spec — Nessi Design System v1

Source: `https://0m34aamgen-7200.hosted.obvious.ai/design-system.html`
Approved: 2026-03-23

---

## Decisions

- **Data wiring:** All new components use typed-props-only. Service layers will be added when backend is ready.
- **Placement:** All auto-sorted placements approved as-is — no overrides.
- **Naming:** All component names match the design system naming (kebab-case for files/folders).

## New Feature Directories

| Directory                 | CLAUDE.md                            |
| ------------------------- | ------------------------------------ |
| `src/features/messaging/` | Minimal — messaging domain           |
| `src/features/orders/`    | Minimal — orders domain              |
| `src/features/dashboard/` | Minimal — dashboard domain           |
| `src/features/editorial/` | Minimal — editorial/discovery domain |

---

## Components to Scaffold (37)

### Atoms → `src/components/controls/`

#### tooltip

- **Props:** `content: string; placement?: 'top' | 'bottom'; children: ReactNode`
- **Specs:** Dark fill (`--color-neutral-900`), white text, 11px DM Sans Medium, max-width 220px, 6px 10px padding, `--radius-200`. Arrow: 5px CSS border triangle.
- **Behavior:** Hover on desktop, tap on mobile. Max 80 chars.

### Atoms → `src/components/indicators/`

#### date-time-display

- **Props:** `date: Date | string; format: 'relative' | 'absolute' | 'countdown' | 'response-time'; urgent?: boolean`
- **Specs:** Icon + text. 13px regular, neutral-600. Urgent: error-500 + medium weight.
- **Variants:** Relative ("Listed 2 hours ago"), Absolute ("Sold March 14, 2026"), Response time ("Responds in < 2 hrs"), Countdown ("Offer expires in 4 hrs").

#### location-chip

- **Props:** `location: string; variant?: 'inline' | 'pill' | 'pickup'`
- **Specs:** Map pin icon. Inline: 12px regular neutral-600. Pill: sand-200 bg, sand-400 border. Pickup: green-500 color, filled pin.

#### member-badge

- **Props:** `name: string; icon: string; earned: boolean`
- **Specs:** Earned: green bg, white text. Locked: fill bg, border, 60% opacity. Tap opens tooltip.
- **Future service:** `members/services/badges.ts`

### Molecules → `src/components/controls/`

#### avatar

- **Props:** `size?: 'xs' | 'sm' | 'md' | 'lg'; name: string; imageUrl?: string; isShop?: boolean; colorSeed?: string`
- **Specs:** Sizes: xs=24px, sm=32px, md=40px, lg=48px. Green/orange/maroon gradient. Photo with initials fallback. Shop: 2px orange ring. Deterministic gradient per user.

#### tabs

- **Props:** `items: TabItem[]; activeIndex: number; onChange: (index: number) => void`
- **Types:** `TabItem = { label: string; count?: number }`
- **Specs:** Bottom border 2px. Active: green text + 2px green border + SemiBold. Inactive: text-2, Medium.

#### quantity-stepper

- **Props:** `value: number; min?: number; max?: number; size?: 'default' | 'sm' | 'xs'; onChange: (value: number) => void`
- **Specs:** Bordered container, -/count/+ buttons. Min always 1.

### Molecules → `src/components/indicators/`

#### inline-banner

- **Props:** `variant: 'warning' | 'error' | 'info' | 'success'; title: string; description?: string; action?: { label: string; onClick: () => void }`
- **Specs:** Icon (16px) + content (title 13px semibold + desc 12px) + optional action. Not dismissible.

#### notification-row

- **Props:** `type: 'sale' | 'offer' | 'message' | 'price-drop' | 'review'; title: string; description: string; timestamp: Date; isRead: boolean`
- **Specs:** Icon circle + title + desc + timestamp + unread dot (8px orange).
- **Future service:** `notifications/services/`

#### settings-row

- **Props:** `label: string; icon?: ReactNode; value?: string; type: 'toggle' | 'nav' | 'display'; checked?: boolean; onChange?: (checked: boolean) => void; onClick?: () => void`
- **Specs:** Icon + label + value/toggle + chevron.

#### error-state

- **Props:** `variant: 'inline' | 'banner' | '404'; message: string; description?: string; action?: { label: string; onClick: () => void }`
- **Specs:** 404 headline: "The one that got away." Specific, honest messaging. Never expose error codes.

### Molecules → `src/components/layout/`

#### page-header

- **Props:** `title?: string; onBack: () => void; actions?: ReactNode`
- **Specs:** 56px height, parchment bg. Back button 44x44px touch target.

#### progress-bar

- **Props:** `value: number; max: number; label?: string; showPercentage?: boolean`
- **Specs:** 4px tall, sand-400 bg, green-500 fill, pill radius.

#### bottom-sheet

- **Props:** `title: string; isOpen: boolean; onClose: () => void; cta?: { label: string; onClick: () => void }; children: ReactNode`
- **Specs:** Handle 36x4px, 24px top radius, max 85vh. Scrim rgba(28,28,28,0.48). Slide up 300ms ease-out. Z: scrim 500, surface 510.

### Molecules → `src/features/listings/components/`

#### price-display

- **Props:** `price: number; originalPrice?: number; watcherCount?: number; belowAvgLabel?: string; variant?: 'standard' | 'below-avg' | 'price-drop'`
- **Specs:** Standard: price + "or offer". Below avg: green signal. Price drop: strikethrough + red + % badge. Watcher count: orange heart.
- **Future service:** `listings/services/pricing.ts`

#### fee-calculator

- **Props:** `price: number; feeRate: number; isShop?: boolean`
- **Specs:** White surface, border, 20px padding. Rows: listing price, fee, divider, net payout (success green, 20px bold). Shop discount info banner.
- **Future service:** `listings/services/pricing.ts`

#### spec-table

- **Props:** `specs: { key: string; value: string }[]`
- **Specs:** Key: 10px SemiBold uppercase text-2. Value: 14px Medium. 1px fill divider. Never show empty rows.

#### shipping-rate-card

- **Props:** `carrier: string; service: string; price: number; eta: string; isSelected: boolean; isFree?: boolean; onSelect?: () => void`
- **Specs:** Carrier logo 40x28px. Selected: 2px green border + checkmark. Free: "Free" in green text.
- **Future service:** `orders/services/shipping.ts`

#### category-tile

- **Props:** `name: string; image: string; href: string`
- **Specs:** 1:1 square, 8px radius, photo bg + gradient overlay, label centered bottom (11px semibold uppercase white). Grid: mobile 2-col, desktop 4-col.

### Molecules → `src/features/messaging/components/`

#### message-thread

- **Props:** `messages: MessageItem[]; currentUserId: string`
- **Types:** `MessageItem = { id: string; senderId: string; content: string; timestamp: Date; type: 'text' | 'offer' }`
- **Specs:** Column, 12px gap, 16px padding, fill bg. Received: white bg, avatar left. Sent: green bg, white text, avatar right.
- **Future service:** `messaging/services/messaging.ts`

#### offer-bubble

- **Props:** `amount: number; originalPrice: number; expiresAt: Date; status: 'pending' | 'accepted' | 'declined'; onAccept?: () => void; onCounter?: () => void; onDecline?: () => void`
- **Specs:** White bg, 1.5px orange border. Label (10px bold uppercase orange), amount (24px bold), expiry. Actions: Accept/Counter/Decline.
- **Future service:** `messaging/services/offers.ts`

### Molecules → `src/features/orders/components/`

#### order-timeline

- **Props:** `steps: TimelineStep[]; currentStep: number`
- **Types:** `TimelineStep = { label: string; description?: string; timestamp?: Date; icon?: ReactNode }`
- **Specs:** Vertical. Completed: 28px green circle + checkmark + green line. Active: 28px orange + glow. Pending: bordered grey.
- **Future service:** `orders/services/orders.ts`

### Trust & Identity → `src/features/members/components/`

#### verification-badge

- **Props:** `type: string; label: string; variant: 'success' | 'green' | 'orange' | 'maroon' | 'neutral'; icon?: ReactNode`
- **Specs:** Pill shape, 11px semibold, 6px 12px padding, icon + text. Tap opens tooltip.
- **Future service:** `members/services/badges.ts`

#### trust-stat-row

- **Props:** `sellerName: string; avatarUrl?: string; rating: number; salesCount: number; responseTime: string; joinedDate: string; onMessage?: () => void`
- **Specs:** Avatar + name + rating + message button. 3-stat row with vertical dividers, centered, 10px uppercase labels.

#### offer-ui

- **Props:** `amount: number; originalPrice: number; expiresAt: Date; status: 'pending' | 'floor-warning' | 'accepted'; floorAmount?: number; onAccept?: () => void; onCounter?: () => void; onDecline?: () => void; onCheckout?: () => void`
- **Specs:** Pending: orange border, 3 buttons. Floor warning: error bg, "Minimum offer is $X (70%)". Accepted: success bg + checkout CTA. 70% floor enforced client-side.

### Dashboard → `src/features/dashboard/components/`

#### kpi-stat-tile

- **Props:** `label: string; value: string; trend: { direction: 'up' | 'down' | 'flat'; value: string; period: string }`
- **Specs:** 11px uppercase label, 26px bold value, trend arrow. Up=green, down=warning, flat=neutral. Raised surface, 8px radius, shadow.

#### quick-action-card

- **Props:** `icon: ReactNode; label: string; badge?: number; subtitle?: string; href: string`
- **Specs:** Icon (40px circle, semantic color bg) + label + optional badge (20px orange) + optional value + chevron.

#### sparkline

- **Props:** `data: number[]; color?: string; width?: number; height?: number`
- **Specs:** SVG polyline, 120x32 viewBox. Green stroke, fill area rgba 0.08. No chart library.

#### shop-upgrade-prompt

- **Props:** `listingCount: number; totalSales: number; onUpgrade: () => void; onDismiss: () => void`
- **Specs:** Dark green gradient bg, decorative circles. Orange "Upgrade Available" pill, serif headline, benefits checklist, dual CTAs. Triggers at 3+ listings or $100+ sales.

### Editorial → `src/features/editorial/components/`

#### shop-highlight

- **Props:** `shopName: string; location: string; avatarUrl?: string; heroImage: string; quote: string; identityTags: string[]; previewItems: { image: string; price: number }[]; rating: number; salesCount: number; shopUrl: string`
- **Specs:** Hero 160px + gradient overlay + SHOP badge. Body: quote, tags, 3-item grid, rating, "Visit Shop" CTA.

#### maker-story-block

- **Props:** `quote: string; author: string; shopName: string; image: string; imageCaption?: string; narrative: string; ctaLabel: string; ctaHref: string`
- **Specs:** Photo 200px + pull quote (DM Serif Display italic 18px, 3px orange left border) + narrative + ghost CTA.

#### featured-listing-card

- **Props:** `title: string; price: number; sellerName: string; image: string; conditionLabel: string; conditionVariant: string; watcherCount?: number; isFeatured?: boolean; isWatched?: boolean; onWatch?: () => void; href: string`
- **Specs:** 16:9 hero, gradient overlay. Badges top-left, watchlist top-right. Bottom: seller, title (20px bold white), price (22px bold white).

#### species-browse-row

- **Props:** `species: SpeciesItem[]; onSelect: (id: string) => void`
- **Types:** `SpeciesItem = { id: string; name: string; emoji: string; isActive: boolean }`
- **Specs:** Horizontal scroll with snap. 64px circles + 11px label. Active: green border. Inactive: sand border.

#### social-proof-strip

- **Props:** `variant: 'stats' | 'activity'; stats?: { label: string; value: string }[]; activity?: { userName: string; location: string; itemName: string; price: number; timeAgo: string }`
- **Specs:** Stats: green bg, white text, dividers. Activity: sand bg, green pulse dot + transaction text.

#### price-drop-alert

- **Props:** `variant: 'banner' | 'saved-row'; itemName: string; oldPrice: number; newPrice: number; thumbnail?: string`
- **Specs:** Banner: success bg, dollar icon. Saved row: thumbnail + title + prices + drop badge.

#### recently-sold-ticker

- **Props:** `sales: { title: string; price: number; thumbnail: string; timeAgo: string }[]`
- **Specs:** Sand bg, "Recently Sold" header + green pulse dot. Rows: 36px thumbnail + title + timestamp + price. Auto-scroll upward every 4s.
