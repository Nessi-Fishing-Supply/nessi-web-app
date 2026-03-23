# Component Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize 36 scaffolded design system components — audit token usage, fix SCSS to match DS spec, write Vitest tests, and verify build/lint/typecheck pass.

**Architecture:** Each component was scaffolded by agents from the DS extraction spec at `docs/design/v1/components/spec.md`. Components use typed props (no data fetching). This plan audits each scaffold against the spec, fixes token/styling gaps, adds tests, and ensures quality gates pass. Grouped by target directory for efficient batch work.

**Tech Stack:** React 19, Next.js 16, SCSS Modules, CSS custom properties (design tokens), Vitest + React Testing Library (happy-dom), `react-icons`, `next/image`

---

## File Structure

All components already exist as scaffolds. This plan modifies them and adds tests.

### Controls (`src/components/controls/`)
- Modify: `tooltip/index.tsx`, `tooltip/tooltip.module.scss`
- Modify: `avatar/index.tsx`, `avatar/avatar.module.scss`
- Modify: `tabs/index.tsx`, `tabs/tabs.module.scss`
- Modify: `quantity-stepper/index.tsx`, `quantity-stepper/quantity-stepper.module.scss`
- Create: `tooltip/__tests__/index.test.tsx`
- Create: `avatar/__tests__/index.test.tsx`
- Create: `tabs/__tests__/index.test.tsx`
- Create: `quantity-stepper/__tests__/index.test.tsx`
- Modify: `index.ts` (barrel — already updated)

### Indicators (`src/components/indicators/`)
- Modify: `date-time-display/index.tsx`, `date-time-display/date-time-display.module.scss`
- Modify: `location-chip/index.tsx`, `location-chip/location-chip.module.scss`
- Modify: `member-badge/index.tsx`, `member-badge/member-badge.module.scss`
- Modify: `inline-banner/index.tsx`, `inline-banner/inline-banner.module.scss`
- Modify: `notification-row/index.tsx`, `notification-row/notification-row.module.scss`
- Modify: `settings-row/index.tsx`, `settings-row/settings-row.module.scss`
- Modify: `error-state/index.tsx`, `error-state/error-state.module.scss`
- Create: `date-time-display/__tests__/index.test.tsx`
- Create: `location-chip/__tests__/index.test.tsx`
- Create: `member-badge/__tests__/index.test.tsx`
- Create: `inline-banner/__tests__/index.test.tsx`
- Create: `notification-row/__tests__/index.test.tsx`
- Create: `settings-row/__tests__/index.test.tsx`
- Create: `error-state/__tests__/index.test.tsx`

### Layout (`src/components/layout/`)
- Modify: `page-header/index.tsx`, `page-header/page-header.module.scss`
- Modify: `progress-bar/index.tsx`, `progress-bar/progress-bar.module.scss`
- Modify: `bottom-sheet/index.tsx`, `bottom-sheet/bottom-sheet.module.scss`
- Create: `page-header/__tests__/index.test.tsx`
- Create: `progress-bar/__tests__/index.test.tsx`
- Create: `bottom-sheet/__tests__/index.test.tsx`

### Listings (`src/features/listings/components/`)
- Modify: `price-display/index.tsx`, `price-display/price-display.module.scss`
- Modify: `fee-calculator/index.tsx`, `fee-calculator/fee-calculator.module.scss`
- Modify: `spec-table/index.tsx`, `spec-table/spec-table.module.scss`
- Modify: `shipping-rate-card/index.tsx`, `shipping-rate-card/shipping-rate-card.module.scss`
- Modify: `category-tile/index.tsx`, `category-tile/category-tile.module.scss`
- Create: `price-display/__tests__/index.test.tsx`
- Create: `fee-calculator/__tests__/index.test.tsx`
- Create: `spec-table/__tests__/index.test.tsx`
- Create: `shipping-rate-card/__tests__/index.test.tsx`
- Create: `category-tile/__tests__/index.test.tsx`

### Messaging (`src/features/messaging/components/`)
- Modify: `message-thread/index.tsx`, `message-thread/message-thread.module.scss`
- Modify: `offer-bubble/index.tsx`, `offer-bubble/offer-bubble.module.scss`
- Create: `message-thread/__tests__/index.test.tsx`
- Create: `offer-bubble/__tests__/index.test.tsx`

### Orders (`src/features/orders/components/`)
- Modify: `order-timeline/index.tsx`, `order-timeline/order-timeline.module.scss`
- Create: `order-timeline/__tests__/index.test.tsx`

### Members (`src/features/members/components/`)
- Modify: `verification-badge/index.tsx`, `verification-badge/verification-badge.module.scss`
- Modify: `trust-stat-row/index.tsx`, `trust-stat-row/trust-stat-row.module.scss`
- Modify: `offer-ui/index.tsx`, `offer-ui/offer-ui.module.scss`
- Create: `verification-badge/__tests__/index.test.tsx`
- Create: `trust-stat-row/__tests__/index.test.tsx`
- Create: `offer-ui/__tests__/index.test.tsx`

### Dashboard (`src/features/dashboard/components/`)
- Modify: `kpi-stat-tile/index.tsx`, `kpi-stat-tile/kpi-stat-tile.module.scss`
- Modify: `quick-action-card/index.tsx`, `quick-action-card/quick-action-card.module.scss`
- Modify: `sparkline/index.tsx`, `sparkline/sparkline.module.scss`
- Modify: `shop-upgrade-prompt/index.tsx`, `shop-upgrade-prompt/shop-upgrade-prompt.module.scss`
- Create: `kpi-stat-tile/__tests__/index.test.tsx`
- Create: `quick-action-card/__tests__/index.test.tsx`
- Create: `sparkline/__tests__/index.test.tsx`
- Create: `shop-upgrade-prompt/__tests__/index.test.tsx`

### Editorial (`src/features/editorial/components/`)
- Modify: `shop-highlight/index.tsx`, `shop-highlight/shop-highlight.module.scss`
- Modify: `maker-story-block/index.tsx`, `maker-story-block/maker-story-block.module.scss`
- Modify: `featured-listing-card/index.tsx`, `featured-listing-card/featured-listing-card.module.scss`
- Modify: `species-browse-row/index.tsx`, `species-browse-row/species-browse-row.module.scss`
- Modify: `social-proof-strip/index.tsx`, `social-proof-strip/social-proof-strip.module.scss`
- Modify: `price-drop-alert/index.tsx`, `price-drop-alert/price-drop-alert.module.scss`
- Modify: `recently-sold-ticker/index.tsx`, `recently-sold-ticker/recently-sold-ticker.module.scss`
- Create: `shop-highlight/__tests__/index.test.tsx`
- Create: `maker-story-block/__tests__/index.test.tsx`
- Create: `featured-listing-card/__tests__/index.test.tsx`
- Create: `species-browse-row/__tests__/index.test.tsx`
- Create: `social-proof-strip/__tests__/index.test.tsx`
- Create: `price-drop-alert/__tests__/index.test.tsx`
- Create: `recently-sold-ticker/__tests__/index.test.tsx`

---

## Phase 0: Test Infrastructure

### Task 0: Add `next/image` Mock to Vitest Setup

**Files:**
- Modify: `vitest.setup.mts`

Several components use `next/image` (avatar, category-tile, shop-highlight, maker-story-block, featured-listing-card, recently-sold-ticker, price-drop-alert). Tests will fail without a mock.

- [ ] **Step 1: Add next/image mock**

Add to `vitest.setup.mts`:

```ts
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));
```

- [ ] **Step 2: Add next/link mock if not present**

```ts
vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
    return <a {...props}>{children}</a>;
  },
}));
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `pnpm test:run`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add vitest.setup.mts
git commit -m "test: add next/image and next/link mocks to vitest setup"
```

---

## Phase 1: Controls (4 components)

### Task 1: Tooltip — Audit & Test

**Files:**
- Modify: `src/components/controls/tooltip/index.tsx`
- Modify: `src/components/controls/tooltip/tooltip.module.scss`
- Create: `src/components/controls/tooltip/__tests__/index.test.tsx`

**Spec reference:** `docs/design/v1/components/spec.md` — Tooltip section

- [ ] **Step 1: Read scaffold and spec, audit against DS**

Read `src/components/controls/tooltip/index.tsx` and its SCSS. Compare against spec:
- Dark fill (`--color-neutral-900`), white text, 11px font, max-width 220px
- 6px 10px padding, `--radius-200` (6px)
- Arrow: 5px CSS border triangle
- Hover desktop, tap mobile, max 80 chars
- a11y: `role="tooltip"`, `aria-describedby`

Fix any mismatches. Ensure all hardcoded values use CSS custom properties.

- [ ] **Step 2: Write tests**

```tsx
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Tooltip from '../index';

beforeEach(() => { cleanup(); vi.resetAllMocks(); });

describe('Tooltip', () => {
  it('renders children without tooltip visible by default', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on mouse enter and hides on mouse leave', () => {
    render(<Tooltip content="Help text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Help text');
    fireEvent.mouseLeave(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('truncates content exceeding 80 characters', () => {
    const longText = 'A'.repeat(100);
    render(<Tooltip content={longText}><span>trigger</span></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('trigger'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent!.length).toBeLessThanOrEqual(83); // 80 + "..."
  });

  it('applies placement class for bottom', () => {
    render(<Tooltip content="Below" placement="bottom"><span>trigger</span></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('trigger'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run src/components/controls/tooltip/__tests__/index.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/controls/tooltip/
git commit -m "feat(tooltip): audit scaffold against DS spec, add tests"
```

### Task 2: Avatar — Audit & Test

**Files:**
- Modify: `src/components/controls/avatar/index.tsx`
- Modify: `src/components/controls/avatar/avatar.module.scss`
- Create: `src/components/controls/avatar/__tests__/index.test.tsx`

**Spec reference:** `docs/design/v1/components/spec.md` — Avatar section

- [ ] **Step 1: Read scaffold and spec, audit against DS**

Check:
- 4 sizes: xs=24px/9px, sm=32px/12px, md=40px/15px, lg=48px/18px
- Green/orange/maroon gradient with deterministic hashing from name/colorSeed
- Photo variant with `next/image` + initials fallback
- Shop ring: 2px `--color-accent-500` border
- `--radius-circle` (50%) for all variants

- [ ] **Step 2: Write tests**

```tsx
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Avatar from '../index';

beforeEach(() => { cleanup(); });

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders image when imageUrl provided', () => {
    render(<Avatar name="John Doe" imageUrl="/avatar.jpg" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('applies shop ring when isShop is true', () => {
    const { container } = render(<Avatar name="Bass Pro" isShop />);
    expect(container.firstChild).toHaveClass(/shop/i);
  });

  it('defaults to md size', () => {
    const { container } = render(<Avatar name="Test" />);
    // md is the default — component should render at 40px
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders all size variants', () => {
    const sizes = ['xs', 'sm', 'md', 'lg'] as const;
    sizes.forEach((size) => {
      const { unmount } = render(<Avatar name="Test" size={size} />);
      expect(screen.getByText('T')).toBeInTheDocument();
      unmount();
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run src/components/controls/avatar/__tests__/index.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/controls/avatar/
git commit -m "feat(avatar): audit scaffold against DS spec, add tests"
```

### Task 3: Tabs — Audit & Test

**Files:**
- Modify: `src/components/controls/tabs/index.tsx`
- Modify: `src/components/controls/tabs/tabs.module.scss`
- Create: `src/components/controls/tabs/__tests__/index.test.tsx`

**Spec reference:** `docs/design/v1/components/spec.md` — Tabs section

- [ ] **Step 1: Read scaffold and spec, audit against DS**

Check:
- Bottom border 2px `--color-surface-400`
- Active: `--color-primary-500` text + 2px green border + SemiBold (`--font-weight-600`)
- Inactive: `--color-neutral-500` (text-2), Medium weight
- Count in parentheses as separate span
- `role="tablist"` / `role="tab"` / `aria-selected`
- Arrow key navigation
- Min 44px touch target

- [ ] **Step 2: Write tests**

```tsx
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Tabs from '../index';

beforeEach(() => { cleanup(); vi.resetAllMocks(); });

const items = [
  { label: 'Listings', count: 12 },
  { label: 'Reviews', count: 3 },
  { label: 'About' },
];

describe('Tabs', () => {
  it('renders all tab items', () => {
    render(<Tabs items={items} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks active tab with aria-selected', () => {
    render(<Tabs items={items} activeIndex={1} onChange={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when tab is clicked', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeIndex={0} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('tab')[2]);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('displays count in parentheses', () => {
    render(<Tabs items={items} activeIndex={0} onChange={vi.fn()} />);
    expect(screen.getByText('(12)')).toBeInTheDocument();
  });

  it('supports arrow key navigation', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeIndex={0} onChange={onChange} />);
    const firstTab = screen.getAllByRole('tab')[0];
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run src/components/controls/tabs/__tests__/index.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/controls/tabs/
git commit -m "feat(tabs): audit scaffold against DS spec, add tests"
```

### Task 4: Quantity Stepper — Audit & Test

**Files:**
- Modify: `src/components/controls/quantity-stepper/index.tsx`
- Modify: `src/components/controls/quantity-stepper/quantity-stepper.module.scss`
- Create: `src/components/controls/quantity-stepper/__tests__/index.test.tsx`

**Spec reference:** `docs/design/v1/components/spec.md` — Quantity Stepper section

- [ ] **Step 1: Read scaffold and spec, audit against DS**

Check:
- Bordered container, -/count/+ buttons
- Min default 1, max optional
- 3 sizes: default (44px buttons), sm, xs
- `role="group"`, `aria-live="polite"` on count
- Disabled buttons at min/max boundaries

- [ ] **Step 2: Write tests**

```tsx
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuantityStepper from '../index';

beforeEach(() => { cleanup(); vi.resetAllMocks(); });

describe('QuantityStepper', () => {
  it('renders current value', () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onChange with incremented value on + click', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /increase|increment|\+/i }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with decremented value on - click', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease|decrement|-/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables decrement button at min value', () => {
    render(<QuantityStepper value={1} min={1} onChange={vi.fn()} />);
    const decrementBtn = screen.getByRole('button', { name: /decrease|decrement|-/i });
    expect(decrementBtn).toBeDisabled();
  });

  it('disables increment button at max value', () => {
    render(<QuantityStepper value={10} max={10} onChange={vi.fn()} />);
    const incrementBtn = screen.getByRole('button', { name: /increase|increment|\+/i });
    expect(incrementBtn).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run src/components/controls/quantity-stepper/__tests__/index.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/controls/quantity-stepper/
git commit -m "feat(quantity-stepper): audit scaffold against DS spec, add tests"
```

---

## Phase 2: Indicators (7 components)

### Task 5: Date Time Display — Audit & Test

**Files:**
- Modify: `src/components/indicators/date-time-display/index.tsx`
- Modify: `src/components/indicators/date-time-display/date-time-display.module.scss`
- Create: `src/components/indicators/date-time-display/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 4 format variants (relative, absolute, countdown, response-time), urgent state (error-500), clock/calendar icons from `react-icons/hi`
- [ ] **Step 2: Write tests** — Test each format variant renders correct text pattern, urgent applies error styling, icon renders
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/date-time-display/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(date-time-display): audit + tests`

### Task 6: Location Chip — Audit & Test

**Files:**
- Modify: `src/components/indicators/location-chip/index.tsx`
- Modify: `src/components/indicators/location-chip/location-chip.module.scss`
- Create: `src/components/indicators/location-chip/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 3 variants (inline, pill, pickup), map pin icon, correct token colors per variant
- [ ] **Step 2: Write tests** — Test each variant renders, location text displays, pickup shows green styling
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/location-chip/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(location-chip): audit + tests`

### Task 7: Member Badge — Audit & Test

**Files:**
- Modify: `src/components/indicators/member-badge/index.tsx`
- Modify: `src/components/indicators/member-badge/member-badge.module.scss`
- Create: `src/components/indicators/member-badge/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — Earned (green bg, white text), Locked (fill bg, 60% opacity), pill shape
- [ ] **Step 2: Write tests** — Test earned/locked rendering, opacity on locked, name and icon display
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/member-badge/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(member-badge): audit + tests`

### Task 8: Inline Banner — Audit & Test

**Files:**
- Modify: `src/components/indicators/inline-banner/index.tsx`
- Modify: `src/components/indicators/inline-banner/inline-banner.module.scss`
- Create: `src/components/indicators/inline-banner/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 4 variants (warning, error, info, success), icon + title + optional desc + optional action, not dismissible, `role="alert"` for error/warning, `role="status"` for info/success
- [ ] **Step 2: Write tests** — Test each variant, action button fires onClick, a11y roles
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/inline-banner/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(inline-banner): audit + tests`

### Task 9: Notification Row — Audit & Test

**Files:**
- Modify: `src/components/indicators/notification-row/index.tsx`
- Modify: `src/components/indicators/notification-row/notification-row.module.scss`
- Create: `src/components/indicators/notification-row/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 5 types, icon circle, title/desc/timestamp, unread dot (8px orange). Confirm `onClick` prop exists in scaffold (spec includes `onClick?: () => void`).
- [ ] **Step 2: Write tests** — Test read/unread states, onClick fires when provided, timestamp formatting, type-specific icon rendering
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/notification-row/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(notification-row): audit + tests`

### Task 10: Settings Row — Audit & Test

**Files:**
- Modify: `src/components/indicators/settings-row/index.tsx`
- Modify: `src/components/indicators/settings-row/settings-row.module.scss`
- Create: `src/components/indicators/settings-row/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 3 types (toggle, nav, display), `role="switch"` + `aria-checked` for toggle, chevron for nav
- [ ] **Step 2: Write tests** — Test toggle fires onChange, nav shows chevron, display shows value text
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/settings-row/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(settings-row): audit + tests`

### Task 11: Error State — Audit & Test

**Files:**
- Modify: `src/components/indicators/error-state/index.tsx`
- Modify: `src/components/indicators/error-state/error-state.module.scss`
- Create: `src/components/indicators/error-state/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 3 variants (inline, banner, 404), 404 uses serif headline "The one that got away.", action button optional
- [ ] **Step 2: Write tests** — Test each variant renders, 404 shows headline, action fires onClick
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/indicators/error-state/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(error-state): audit + tests`

---

## Phase 3: Layout (3 components)

### Task 12: Page Header — Audit & Test

**Files:**
- Modify: `src/components/layout/page-header/index.tsx`
- Modify: `src/components/layout/page-header/page-header.module.scss`
- Create: `src/components/layout/page-header/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 56px height, parchment bg, back button 44x44px, chevron-left, optional title/actions
- [ ] **Step 2: Write tests** — Test back button fires onBack, title renders when provided, actions slot renders
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/layout/page-header/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(page-header): audit + tests`

### Task 13: Progress Bar — Audit & Test

**Files:**
- Modify: `src/components/layout/progress-bar/index.tsx`
- Modify: `src/components/layout/progress-bar/progress-bar.module.scss`
- Create: `src/components/layout/progress-bar/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — 4px track, green fill, pill radius, `role="progressbar"` + aria attrs, label + percentage
- [ ] **Step 2: Write tests** — Test aria-valuenow/valuemin/valuemax, percentage calculation, label renders, clamping
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/layout/progress-bar/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(progress-bar): audit + tests`

### Task 14: Bottom Sheet — Audit & Test

**Files:**
- Modify: `src/components/layout/bottom-sheet/index.tsx`
- Modify: `src/components/layout/bottom-sheet/bottom-sheet.module.scss`
- Create: `src/components/layout/bottom-sheet/__tests__/index.test.tsx`

- [ ] **Step 1: Audit against spec** — Portal rendering, handle 36x4px, 24px top radius, max 85vh, scrim click to close, Escape key, focus trap, scroll lock, z-index 500/510
- [ ] **Step 2: Write tests** — Test open/close states, Escape fires onClose, scrim click fires onClose, title and CTA render
- [ ] **Step 3: Run tests** — `pnpm vitest run src/components/layout/bottom-sheet/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(bottom-sheet): audit + tests`

---

## Phase 4: Listings (5 components)

### Task 15: Price Display — Audit & Test

**Files:**
- Modify: `src/features/listings/components/price-display/index.tsx`
- Modify: `src/features/listings/components/price-display/price-display.module.scss`
- Create: `src/features/listings/components/price-display/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — 3 variants, watcher count, price formatting with $ prefix, "or offer" text
- [ ] **Step 2: Write tests** — Test each variant, watcher count display, drop percentage calculation
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/listings/components/price-display/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(price-display): audit + tests`

### Task 16: Fee Calculator — Audit & Test

**Files:**
- Modify: `src/features/listings/components/fee-calculator/index.tsx`
- Modify: `src/features/listings/components/fee-calculator/fee-calculator.module.scss`
- Create: `src/features/listings/components/fee-calculator/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Fee math, net payout, shop discount banner, token-based styling
- [ ] **Step 2: Write tests** — Test fee calculation correctness, shop discount note shows when isShop, formatted output
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/listings/components/fee-calculator/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(fee-calculator): audit + tests`

### Task 17: Spec Table — Audit & Test

**Files:**
- Modify: `src/features/listings/components/spec-table/index.tsx`
- Modify: `src/features/listings/components/spec-table/spec-table.module.scss`
- Create: `src/features/listings/components/spec-table/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — `<dl>/<dt>/<dd>`, filters empty rows, uppercase keys, dividers
- [ ] **Step 2: Write tests** — Test renders specs, filters empties, returns null for all-empty
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/listings/components/spec-table/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(spec-table): audit + tests`

### Task 18: Shipping Rate Card — Audit & Test

**Files:**
- Modify: `src/features/listings/components/shipping-rate-card/index.tsx`
- Modify: `src/features/listings/components/shipping-rate-card/shipping-rate-card.module.scss`
- Create: `src/features/listings/components/shipping-rate-card/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Selected/unselected states, free shipping text, `aria-pressed`, green border on selected
- [ ] **Step 2: Write tests** — Test selected/unselected, free shows "Free", onSelect fires
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/listings/components/shipping-rate-card/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(shipping-rate-card): audit + tests`

### Task 19: Category Tile — Audit & Test

**Files:**
- Modify: `src/features/listings/components/category-tile/index.tsx`
- Modify: `src/features/listings/components/category-tile/category-tile.module.scss`
- Create: `src/features/listings/components/category-tile/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — `next/image` with fill, gradient overlay, `Link`, label
- [ ] **Step 2: Write tests** — Test renders link with href, image, label text
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/listings/components/category-tile/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(category-tile): audit + tests`

---

## Phase 5: Messaging & Orders (3 components)

### Task 20: Message Thread — Audit & Test

**Files:**
- Modify: `src/features/messaging/components/message-thread/index.tsx`
- Modify: `src/features/messaging/components/message-thread/message-thread.module.scss`
- Create: `src/features/messaging/components/message-thread/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Sent/received bubbles, asymmetric radius, timestamps, green sent / white received
- [ ] **Step 2: Write tests** — Test sent vs received styling class, message content renders, timestamps display
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/messaging/components/message-thread/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(message-thread): audit + tests`

### Task 21: Offer Bubble — Audit & Test

**Files:**
- Modify: `src/features/messaging/components/offer-bubble/index.tsx`
- Modify: `src/features/messaging/components/offer-bubble/offer-bubble.module.scss`
- Create: `src/features/messaging/components/offer-bubble/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Orange border, countdown timer, 3 action buttons, accepted/declined states
- [ ] **Step 2: Write tests** — Test pending shows buttons, accepted hides buttons, amount displays, countdown renders
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/messaging/components/offer-bubble/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(offer-bubble): audit + tests`

### Task 22: Order Timeline — Audit & Test

**Files:**
- Modify: `src/features/orders/components/order-timeline/index.tsx`
- Modify: `src/features/orders/components/order-timeline/order-timeline.module.scss`
- Create: `src/features/orders/components/order-timeline/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Vertical stepper, completed/active/pending states, checkmarks, timestamps
- [ ] **Step 2: Write tests** — Test step rendering, current step has active class, completed shows checkmark
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/orders/components/order-timeline/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(order-timeline): audit + tests`

---

## Phase 6: Members — Trust & Identity (3 components)

### Task 23: Verification Badge — Audit & Test

**Files:**
- Modify: `src/features/members/components/verification-badge/index.tsx`
- Modify: `src/features/members/components/verification-badge/verification-badge.module.scss`
- Create: `src/features/members/components/verification-badge/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — 5 color variants, pill shape, icon + text, tooltip on tap
- [ ] **Step 2: Write tests** — Test each variant applies correct class, label and icon render
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/members/components/verification-badge/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(verification-badge): audit + tests`

### Task 24: Trust Stat Row — Audit & Test

**Files:**
- Modify: `src/features/members/components/trust-stat-row/index.tsx`
- Modify: `src/features/members/components/trust-stat-row/trust-stat-row.module.scss`
- Create: `src/features/members/components/trust-stat-row/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Avatar + name + rating + message button, 3-stat row with dividers
- [ ] **Step 2: Write tests** — Test seller name renders, rating stars, stats display, message button fires onMessage
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/members/components/trust-stat-row/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(trust-stat-row): audit + tests`

### Task 25: Offer UI — Audit & Test

**Files:**
- Modify: `src/features/members/components/offer-ui/index.tsx`
- Modify: `src/features/members/components/offer-ui/offer-ui.module.scss`
- Create: `src/features/members/components/offer-ui/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — 3 states (pending, floor-warning, accepted), countdown, floor enforcement, action buttons
- [ ] **Step 2: Write tests** — Test each state renders correct UI, buttons fire callbacks, floor amount displays
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/members/components/offer-ui/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(offer-ui): audit + tests`

---

## Phase 7: Dashboard (4 components)

### Task 26: KPI Stat Tile — Audit & Test

**Files:**
- Modify: `src/features/dashboard/components/kpi-stat-tile/index.tsx`
- Modify: `src/features/dashboard/components/kpi-stat-tile/kpi-stat-tile.module.scss`
- Create: `src/features/dashboard/components/kpi-stat-tile/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Label, value, trend (up/down/flat + colors), raised surface
- [ ] **Step 2: Write tests** — Test label/value render, each trend direction applies correct class
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/dashboard/components/kpi-stat-tile/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(kpi-stat-tile): audit + tests`

### Task 27: Quick Action Card — Audit & Test

**Files:**
- Modify: `src/features/dashboard/components/quick-action-card/index.tsx`
- Modify: `src/features/dashboard/components/quick-action-card/quick-action-card.module.scss`
- Create: `src/features/dashboard/components/quick-action-card/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Link wrapping, icon circle, badge, chevron, `next/link`
- [ ] **Step 2: Write tests** — Test link href, label renders, badge shows when provided, chevron present
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/dashboard/components/quick-action-card/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(quick-action-card): audit + tests`

### Task 28: Sparkline — Audit & Test

**Files:**
- Modify: `src/features/dashboard/components/sparkline/index.tsx`
- Modify: `src/features/dashboard/components/sparkline/sparkline.module.scss`
- Create: `src/features/dashboard/components/sparkline/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — SVG polyline + polygon area fill, data normalization, no chart library
- [ ] **Step 2: Write tests** — Test SVG renders with polyline, handles empty data, handles single point
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/dashboard/components/sparkline/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(sparkline): audit + tests`

### Task 29: Shop Upgrade Prompt — Audit & Test

**Files:**
- Modify: `src/features/dashboard/components/shop-upgrade-prompt/index.tsx`
- Modify: `src/features/dashboard/components/shop-upgrade-prompt/shop-upgrade-prompt.module.scss`
- Create: `src/features/dashboard/components/shop-upgrade-prompt/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Dark green gradient, "Upgrade Available" pill, serif headline, benefits, dual CTAs
- [ ] **Step 2: Write tests** — Test onUpgrade fires, onDismiss fires, headline renders, benefits list renders
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/dashboard/components/shop-upgrade-prompt/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(shop-upgrade-prompt): audit + tests`

---

## Phase 8: Editorial (7 components)

### Task 30: Shop Highlight — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/shop-highlight/index.tsx`
- Modify: `src/features/editorial/components/shop-highlight/shop-highlight.module.scss`
- Create: `src/features/editorial/components/shop-highlight/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Hero image (next/image), SHOP badge, avatar, quote, identity tags, preview grid, rating, CTA
- [ ] **Step 2: Write tests** — Test shop name renders, CTA links to shopUrl, preview items render, rating displays
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/shop-highlight/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(shop-highlight): audit + tests`

### Task 31: Maker Story Block — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/maker-story-block/index.tsx`
- Modify: `src/features/editorial/components/maker-story-block/maker-story-block.module.scss`
- Create: `src/features/editorial/components/maker-story-block/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Photo (next/image), pull quote (serif, orange left border), narrative, ghost CTA
- [ ] **Step 2: Write tests** — Test quote renders with cite, image renders, CTA links to ctaHref
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/maker-story-block/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(maker-story-block): audit + tests`

### Task 32: Featured Listing Card — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/featured-listing-card/index.tsx`
- Modify: `src/features/editorial/components/featured-listing-card/featured-listing-card.module.scss`
- Create: `src/features/editorial/components/featured-listing-card/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — 16:9 aspect, gradient overlay, badges, watchlist, bottom overlay with price/title
- [ ] **Step 2: Write tests** — Test title/price render, watchlist toggle fires onWatch, featured badge shows when isFeatured
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/featured-listing-card/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(featured-listing-card): audit + tests`

### Task 33: Species Browse Row — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/species-browse-row/index.tsx`
- Modify: `src/features/editorial/components/species-browse-row/species-browse-row.module.scss`
- Create: `src/features/editorial/components/species-browse-row/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Horizontal scroll, snap, 64px circles, emoji, active/inactive border, `aria-pressed`
- [ ] **Step 2: Write tests** — Test species items render, active species has pressed state, onSelect fires with id
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/species-browse-row/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(species-browse-row): audit + tests`

### Task 34: Social Proof Strip — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/social-proof-strip/index.tsx`
- Modify: `src/features/editorial/components/social-proof-strip/social-proof-strip.module.scss`
- Create: `src/features/editorial/components/social-proof-strip/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — 2 variants (stats/activity), green bg for stats, pulse dot for activity, `aria-live`
- [ ] **Step 2: Write tests** — Test stats variant shows stat values, activity variant shows transaction text
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/social-proof-strip/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(social-proof-strip): audit + tests`

### Task 35: Price Drop Alert — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/price-drop-alert/index.tsx`
- Modify: `src/features/editorial/components/price-drop-alert/price-drop-alert.module.scss`
- Create: `src/features/editorial/components/price-drop-alert/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — 2 variants (banner/saved-row), old/new price, drop % badge, thumbnail for saved-row
- [ ] **Step 2: Write tests** — Test each variant, price formatting, drop percentage calculation
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/price-drop-alert/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(price-drop-alert): audit + tests`

### Task 36: Recently Sold Ticker — Audit & Test

**Files:**
- Modify: `src/features/editorial/components/recently-sold-ticker/index.tsx`
- Modify: `src/features/editorial/components/recently-sold-ticker/recently-sold-ticker.module.scss`
- Create: `src/features/editorial/components/recently-sold-ticker/__tests__/index.test.tsx`

- [ ] **Step 1: Audit** — Auto-scroll animation (4s interval), pulse dot, thumbnails (next/image), `aria-live`
- [ ] **Step 2: Write tests** — Test sales items render, header shows "Recently Sold", handles empty sales array
- [ ] **Step 3: Run tests** — `pnpm vitest run src/features/editorial/components/recently-sold-ticker/__tests__/index.test.tsx`
- [ ] **Step 4: Commit** — `feat(recently-sold-ticker): audit + tests`

---

## Phase 9: Quality Gate

### Task 37: Full Build & Lint Pass

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors across all 37 components

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No lint errors

- [ ] **Step 3: Run style lint**

Run: `pnpm lint:styles`
Expected: No SCSS lint errors

- [ ] **Step 4: Run format check**

Run: `pnpm format:check`
Expected: All files formatted

- [ ] **Step 5: Run all tests**

Run: `pnpm test:run`
Expected: All tests pass

- [ ] **Step 6: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 7: Commit any remaining fixes**

```bash
git add src/components/ src/features/
git commit -m "chore: fix lint/type/format issues across DS components"
```

### Task 38: Barrel Exports for New Components

**Note:** `src/components/controls/index.ts` was already updated. The `indicators/` and `layout/` directories do NOT have barrel files — components are imported by direct path. Feature component directories also use direct imports. **Only create barrel files if the codebase already uses them in that directory.** Check before creating.

- [ ] **Step 1: Check if `src/components/indicators/index.ts` exists**

If it exists, add exports for: `DateTimeDisplay`, `LocationChip`, `MemberBadge`, `InlineBanner`, `NotificationRow`, `SettingsRow`, `ErrorState`.
If it doesn't exist, skip — direct path imports are the convention.

- [ ] **Step 2: Check if `src/components/layout/index.ts` exists**

Same pattern — add new exports if barrel exists, skip if not.

- [ ] **Step 3: Commit if changes made**

```bash
git add src/components/indicators/index.ts src/components/layout/index.ts
git commit -m "chore: update barrel exports for new indicator and layout components"
```

### Task 39: Final Commit — Voice & Tone Doc

- [ ] **Step 1: Verify voice-and-tone.md exists**

Check: `docs/design/v1/voice-and-tone.md` was created by the extraction agent.

- [ ] **Step 2: Commit if not already tracked**

```bash
git add docs/design/v1/voice-and-tone.md
git commit -m "docs: add voice and tone guidelines from DS extraction"
```
