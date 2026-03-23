'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { HiInbox, HiPlus, HiCheck } from 'react-icons/hi';

// Client-only mount detection without useEffect + setState
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;
function useIsMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ── Shared Controls ──────────────────────────────────────────────
import Button from '@/components/controls/button';
import Input from '@/components/controls/input';
import Toggle from '@/components/controls/toggle';
import Tooltip from '@/components/controls/tooltip';
import Avatar from '@/components/controls/avatar';
import Tabs from '@/components/controls/tabs';
import type { TabItem } from '@/components/controls/tabs';
import QuantityStepper from '@/components/controls/quantity-stepper';

// ── Shared Indicators ────────────────────────────────────────────
import Pill from '@/components/indicators/pill';
import DateTimeDisplay from '@/components/indicators/date-time-display';
import LocationChip from '@/components/indicators/location-chip';
import MemberBadge from '@/components/indicators/member-badge';
import InlineBanner from '@/components/indicators/inline-banner';
import NotificationRow from '@/components/indicators/notification-row';
import SettingsRow from '@/components/indicators/settings-row';
import ErrorState from '@/components/indicators/error-state';

// ── Shared Layout ────────────────────────────────────────────────
import PageHeader from '@/components/layout/page-header';
import ProgressBar from '@/components/layout/progress-bar';
import BottomSheet from '@/components/layout/bottom-sheet';

// ── Listings ─────────────────────────────────────────────────────
import PriceDisplay from '@/features/listings/components/price-display';
import FeeCalculator from '@/features/listings/components/fee-calculator';
import SpecTable from '@/features/listings/components/spec-table';
import ShippingRateCard from '@/features/listings/components/shipping-rate-card';
import CategoryTile from '@/features/listings/components/category-tile';
import ConditionBadge from '@/features/listings/components/condition-badge';

// ── Messaging ────────────────────────────────────────────────────
import MessageThread from '@/features/messaging/components/message-thread';
import OfferBubble from '@/features/messaging/components/offer-bubble';

// ── Orders ───────────────────────────────────────────────────────
import OrderTimeline from '@/features/orders/components/order-timeline';

// ── Members ──────────────────────────────────────────────────────
import VerificationBadge from '@/features/members/components/verification-badge';
import TrustStatRow from '@/features/members/components/trust-stat-row';
import OfferUI from '@/features/members/components/offer-ui';

// ── Dashboard ────────────────────────────────────────────────────
import KpiStatTile from '@/features/dashboard/components/kpi-stat-tile';
import QuickActionCard from '@/features/dashboard/components/quick-action-card';
import Sparkline from '@/features/dashboard/components/sparkline';
import ShopUpgradePrompt from '@/features/dashboard/components/shop-upgrade-prompt';

// ── Editorial ────────────────────────────────────────────────────
import ShopHighlight from '@/features/editorial/components/shop-highlight';
import MakerStoryBlock from '@/features/editorial/components/maker-story-block';
import FeaturedListingCard from '@/features/editorial/components/featured-listing-card';
import SpeciesBrowseRow from '@/features/editorial/components/species-browse-row';
import SocialProofStrip from '@/features/editorial/components/social-proof-strip';
import PriceDropAlert from '@/features/editorial/components/price-drop-alert';
import RecentlySoldTicker from '@/features/editorial/components/recently-sold-ticker';

import styles from './components.module.scss';

// ═══════════════════════════════════════════════════════════════════
// Color Token Data (matching reference)
// ═══════════════════════════════════════════════════════════════════

const GREEN_COLORS = [
  { name: 'green-100', hex: '#D6E9E4' },
  { name: 'green-300', hex: '#6BAD99' },
  { name: 'green-500', hex: '#1E4A40' },
  { name: 'green-600', hex: '#163831' },
  { name: 'green-700', hex: '#0E2822' },
];

const ORANGE_COLORS = [
  { name: 'orange-100', hex: '#FBE9D9' },
  { name: 'orange-300', hex: '#EEA86B' },
  { name: 'orange-500', hex: '#E27739' },
  { name: 'orange-700', hex: '#B55A28' },
  { name: 'orange-900', hex: '#5C2A0C' },
];

const SAND_COLORS = [
  { name: 'sand-100', hex: '#FAF7F2', desc: 'overlay' },
  { name: 'sand-200', hex: '#F5EDDF', desc: 'raised' },
  { name: 'sand-300', hex: '#EDE0CB', desc: 'page' },
  { name: 'sand-400', hex: '#E3D1B4', desc: 'sunken' },
  { name: 'sand-800', hex: '#7A6E62', desc: 'text 2' },
];

const SURFACE_TOKENS = [
  { name: '--surface-page', desc: 'sand-300', hex: '#EDE0CB' },
  { name: '--surface-raised', desc: 'sand-200 · cards', hex: '#F5EDDF' },
  { name: '--surface-overlay', desc: 'sand-100 · modal', hex: '#FAF7F2' },
  { name: '--surface-sunken', desc: 'sand-400 · inset', hex: '#E3D1B4' },
  { name: '--surface-nav', desc: 'green-500 · top nav', hex: '#1E4A40' },
];

const SPACING_ITEMS = [
  { token: '--spacing-100', px: 4 },
  { token: '--spacing-200', px: 8 },
  { token: '--spacing-300', px: 12 },
  { token: '--spacing-400', px: 16 },
  { token: '--spacing-600', px: 24 },
  { token: '--spacing-700', px: 32 },
  { token: '--spacing-1000', px: 64 },
];

const RADIUS_ITEMS = [
  { token: '--radius-100', px: 4 },
  { token: '--radius-300', px: 8 },
  { token: '--radius-500', px: 12 },
  { token: '--radius-600', px: 16 },
  { token: '--radius-800', label: 'pill', px: 999 },
];

const SHADOW_ITEMS = [
  { name: '--shadow-100', value: '0 1px 2px rgba(0,0,0,0.06)' },
  { name: '--shadow-200', value: '0 2px 8px rgba(0,0,0,0.08)' },
  { name: '--shadow-300', value: '0 4px 16px rgba(0,0,0,0.10)' },
  { name: '--shadow-sell', value: '0 4px 12px rgba(226,119,57,0.45)' },
];

// ═══════════════════════════════════════════════════════════════════
// Form Wrapper
// ═══════════════════════════════════════════════════════════════════

function FormDemo() {
  const methods = useForm({
    defaultValues: { title: '', price: '' },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formGrid}>
          <div className={styles.formItem}>
            <Input name="title" label="Item title" placeholder="e.g. Shimano Stradic FL 2500…" />
          </div>
          <div className={styles.formItem}>
            <Input name="price" label="Asking price" placeholder="$0.00" />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Color Swatch Row
// ═══════════════════════════════════════════════════════════════════

function ColorRow({ colors }: { colors: { name: string; hex: string; desc?: string }[] }) {
  return (
    <div className={styles.colorRow}>
      {colors.map((c) => (
        <div key={c.name} className={styles.colorSwatch}>
          <div className={styles.swatchFill} style={{ background: c.hex }} />
          <div className={styles.swatchInfo}>
            <div className={styles.swatchName}>{c.name}</div>
            <div className={styles.swatchHex}>
              {c.hex}
              {c.desc ? ` · ${c.desc}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Showcase
// ═══════════════════════════════════════════════════════════════════

// Stable demo dates to avoid hydration mismatch from Date.now()
const DEMO_NOW = new Date('2026-03-23T12:00:00Z');
const DEMO_1H_AGO = new Date('2026-03-23T11:00:00Z');
const DEMO_2H_AGO = new Date('2026-03-23T10:00:00Z');
const DEMO_30M_AGO = new Date('2026-03-23T11:30:00Z');
const DEMO_TOMORROW = new Date('2026-03-24T12:00:00Z');

export default function ComponentShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [toggleOffers, setToggleOffers] = useState(true);
  const [togglePickup, setTogglePickup] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qtyValue, setQtyValue] = useState(1);
  const [settingsToggle, setSettingsToggle] = useState(true);
  const mounted = useIsMounted();

  const tabItems: TabItem[] = useMemo(
    () => [{ label: 'Details' }, { label: 'Specs' }, { label: 'Shipping' }, { label: 'Seller' }],
    [],
  );

  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Not Available</h1>
        <p>Component showcase is only available in development.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ════════════════════════════════════════════════════════════
          Top Navigation
          ════════════════════════════════════════════════════════════ */}
      <nav className={styles.topNav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>Nessi</span>
          <span className={styles.navTitle}>Design System</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#foundation">Foundation</a>
          <a href="#navigation">Navigation</a>
          <a href="#components">Components</a>
          <a href="#commerce">Commerce</a>
          <a href="#principles">Principles</a>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          Hero Section
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>Nessi · Design System v2.1</div>
          <h1 className={styles.heroTitle}>
            Built for the <em>water&apos;s edge.</em>
          </h1>
          <p className={styles.heroDesc}>
            A field-journal design language for the C2C fishing gear marketplace. Every token,
            component, and pattern built for trust, discovery, and the feel of the water.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>Type</div>
            <div className={styles.heroMetaValue}>Mobile-first</div>
          </div>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>Palette</div>
            <div className={styles.heroMetaValue}>Parchment / Forest / Burnt Orange</div>
          </div>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>Fonts</div>
            <div className={styles.heroMetaValue}>DM Sans + DM Serif Display</div>
          </div>
          <div className={styles.heroMetaItem}>
            <div className={styles.heroMetaLabel}>Version</div>
            <div className={styles.heroMetaValue}>2.1 · March 2026</div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          01 — Foundation: Color System
          ════════════════════════════════════════════════════════════ */}
      <section id="foundation" className={styles.section}>
        <div className={styles.sectionNumber}>01 — Foundation</div>
        <h2 className={styles.sectionTitle}>Color System</h2>
        <p className={styles.sectionDesc}>
          Three families — Forest Green, Burnt Orange, Sand — plus Maroon. All layered on a warm
          parchment base that makes the whole UI feel like a field journal, not a SaaS dashboard.
        </p>

        <div className={styles.colorSection}>
          <div className={styles.colorGroupLabel}>Forest Green · Brand Primary</div>
          <ColorRow colors={GREEN_COLORS} />
        </div>

        <div className={styles.colorSection}>
          <div className={styles.colorGroupLabel}>Burnt Orange · Accent</div>
          <ColorRow colors={ORANGE_COLORS} />
        </div>

        <div className={styles.colorSection}>
          <div className={styles.colorGroupLabel}>Sand · Parchment Backgrounds</div>
          <ColorRow colors={SAND_COLORS} />
        </div>

        <div className={styles.quoteBlock}>
          &quot;The page is parchment. Surfaces float above it — never white, never chrome. Every
          panel, card, and sheet is a different layer of the same warm earth.&quot;
        </div>

        <div className={styles.colorSection}>
          <div className={styles.colorGroupLabel}>Surface Tokens</div>
          <div className={styles.surfaceRow}>
            {SURFACE_TOKENS.map((s) => (
              <div key={s.name} className={styles.surfaceSwatch}>
                <div className={styles.surfaceFill} style={{ background: s.hex }} />
                <div className={styles.surfaceInfo}>
                  <div className={styles.surfaceName}>{s.name}</div>
                  <div className={styles.surfaceDesc}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          01 — Foundation: Typography
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.typographySection}>
        <div className={styles.section} style={{ padding: 0 }}>
          <div className={styles.sectionNumber} style={{ color: 'rgba(255,255,255,0.4)' }}>
            01 — Foundation
          </div>
          <h2 className={styles.sectionTitle} style={{ color: 'white' }}>
            Typography
          </h2>
          <p className={styles.sectionDesc} style={{ color: 'rgba(255,255,255,0.6)' }}>
            Two fonts, one rule: DM Sans handles everything functional. DM Serif Display is reserved
            for editorial moments only — section headers, the wordmark, empty state headlines. Never
            on product cards, forms, or prices.
          </p>
        </div>

        <div className={styles.typeRow}>
          <div className={styles.typeMeta}>
            <div className={styles.typeFont}>DM Serif Display</div>
            <div className={styles.typeUse}>Editorial only</div>
          </div>
          <div
            className={styles.typePreview}
            style={{ fontFamily: 'var(--font-family-serif)', fontSize: '36px', fontWeight: 400 }}
          >
            Maker Spotlight
          </div>
        </div>

        <div className={styles.typeRow}>
          <div className={styles.typeMeta}>
            <div className={styles.typeFont}>DM Serif Display</div>
            <div className={styles.typeUse}>Italic · wordmark</div>
          </div>
          <div
            className={styles.typePreview}
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: '36px',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            Nessi
          </div>
        </div>

        <div className={styles.typeRow}>
          <div className={styles.typeMeta}>
            <div className={styles.typeFont}>DM Sans 700</div>
            <div className={styles.typeUse}>24px · price / heading</div>
          </div>
          <div className={styles.typePreview} style={{ fontSize: '24px', fontWeight: 700 }}>
            $140.00
          </div>
        </div>

        <div className={styles.typeRow}>
          <div className={styles.typeMeta}>
            <div className={styles.typeFont}>DM Sans 500</div>
            <div className={styles.typeUse}>15px · product title</div>
          </div>
          <div className={styles.typePreview} style={{ fontSize: '15px', fontWeight: 500 }}>
            Shimano Stradic FL 2500
          </div>
        </div>

        <div className={styles.typeRow}>
          <div className={styles.typeMeta}>
            <div className={styles.typeFont}>DM Sans 400</div>
            <div className={styles.typeUse}>14px · body</div>
          </div>
          <div className={styles.typePreview} style={{ fontSize: '14px', fontWeight: 400 }}>
            Ships from Nashville, TN · Usually ships in 1 business day.
          </div>
        </div>

        <div className={styles.typeRow}>
          <div className={styles.typeMeta}>
            <div className={styles.typeFont}>DM Sans 500 · caps</div>
            <div className={styles.typeUse}>9px · nav label</div>
          </div>
          <div
            className={styles.typePreview}
            style={{
              fontSize: '9px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Browse
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          01 — Foundation: Spacing, Radius & Shadow
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>01 — Foundation</div>
        <h2 className={styles.sectionTitle}>Spacing, Radius & Shadow</h2>
        <p className={styles.sectionDesc}>
          Base-4 spacing scale (100–1000) with a 100-scale naming convention matching Tailwind and
          Material. Radius ranges from 4px utility corners to 999px pills. Shadows are layered
          depth, not decoration.
        </p>

        <div className={styles.spacingRadiusGrid}>
          <div className={styles.spacingColumn}>
            <h4>Spacing Scale</h4>
            {SPACING_ITEMS.map((s) => (
              <div key={s.token} className={styles.spacingItem}>
                <div
                  className={styles.spacingDot}
                  style={{ width: Math.max(s.px, 6), height: Math.max(s.px, 6) }}
                />
                <span className={styles.spacingLabel}>
                  {s.token} · {s.px}px
                </span>
              </div>
            ))}
          </div>

          <div className={styles.radiusColumn}>
            <h4>Radius Scale</h4>
            {RADIUS_ITEMS.map((r) => (
              <div key={r.token} className={styles.radiusItem}>
                <div
                  className={styles.radiusBox}
                  style={{ borderRadius: r.px >= 999 ? '999px' : r.px }}
                />
                <span className={styles.radiusLabel}>
                  {r.token} · {r.label || `${r.px}px`}
                </span>
              </div>
            ))}

            <h4 style={{ marginTop: '24px' }}>Shadows</h4>
            <div className={styles.shadowRow}>
              {SHADOW_ITEMS.map((s) => (
                <div key={s.name} className={styles.shadowItem}>
                  <div className={styles.shadowBox} style={{ boxShadow: s.value }} />
                  <div className={styles.shadowLabel}>{s.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          02 — Navigation System
          ════════════════════════════════════════════════════════════ */}
      <section id="navigation" className={styles.section}>
        <div className={styles.sectionNumber}>02 — Navigation</div>
        <h2 className={styles.sectionTitle}>Navigation System</h2>
        <p className={styles.sectionDesc}>
          Two nav bars. The top bar is forest green — brand anchor, search, and account. The bottom
          bar is a floating parchment glass pill: Home · Browse · Sell (FAB) · Inbox · Saved.
          Account lives top-right, not in the bottom row.
        </p>

        <div className={styles.navDemo}>
          <div className={styles.navCard}>
            <h4>Top Navigation</h4>
            <div className={styles.navCardInner}>
              <div className={styles.topNavDemo}>
                <div className={styles.topNavGreen}>
                  <span className={styles.topNavBrand}>Nessi</span>
                  <div className={styles.topNavIcons}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
                      <path
                        d="M21 21l-4.35-4.35"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={styles.topNavNotifDot}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="2" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className={styles.topNavSearch}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M21 21l-4.35-4.35"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Search gear, brands, sellers…</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.navCard}>
            <h4>Bottom Tab Bar</h4>
            <div className={styles.navCardInner}>
              <div className={styles.bottomNavDemo}>
                <div className={styles.bottomNavContent}>
                  <div className={styles.bottomNavContentInner}>…content…</div>
                </div>
                <div className={styles.bottomNavBar}>
                  <div className={`${styles.bottomNavItem} ${styles.bottomNavItemActive}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Home</span>
                  </div>
                  <div className={styles.bottomNavItem}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        rx="1"
                      />
                      <rect
                        x="14"
                        y="3"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        rx="1"
                      />
                      <rect
                        x="3"
                        y="14"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        rx="1"
                      />
                      <rect
                        x="14"
                        y="14"
                        width="7"
                        height="7"
                        stroke="currentColor"
                        strokeWidth="2"
                        rx="1"
                      />
                    </svg>
                    <span>Browse</span>
                  </div>
                  <div className={styles.bottomNavSell}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className={styles.bottomNavItem}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Inbox</span>
                  </div>
                  <div className={styles.bottomNavItem}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          03 — Core Components
          ════════════════════════════════════════════════════════════ */}
      <section id="components" className={styles.section}>
        <div className={styles.sectionNumber}>03 — Components</div>
        <h2 className={styles.sectionTitle}>Core Components</h2>
        <p className={styles.sectionDesc}>
          238 design tokens, 237 CSS classes. Buttons, pills, forms, tabs, and toasts — all built on
          the token layer, all tested in the parchment environment.
        </p>

        {/* Buttons */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Buttons</div>
          <div className={styles.buttonRow}>
            <Button>Primary</Button>
            <Button round>Large</Button>
            <Button style="secondary">Accent</Button>
            <Button style="secondary" outline>
              Ghost
            </Button>
            <Button round style="dark">
              Small
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>

        {/* Pills & Badges */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Pills & Badges</div>
          <div className={styles.pillRow}>
            <ConditionBadge condition="new_with_tags" size="sm" />
            <ConditionBadge condition="like_new" size="sm" />
            <ConditionBadge condition="good" size="sm" />
            <ConditionBadge condition="fair" size="sm" />
            <Pill color="primary">Shop</Pill>
            <Pill>Bass</Pill>
            <Pill>Trout</Pill>
            <Pill color="success">Active</Pill>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div className={styles.pillRow}>
              <VerificationBadge type="identity" label="Verified" variant="success" />
              <VerificationBadge type="seller" label="Top Seller" variant="orange" />
              <VerificationBadge type="id" label="ID Check" variant="green" />
            </div>
          </div>
        </div>

        {/* Toasts */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Toasts</div>
          <div className={styles.toastStack}>
            <div className={`${styles.toastItem} ${styles.toastSuccess}`}>
              <HiCheck /> Listed successfully
            </div>
            <div className={`${styles.toastItem} ${styles.toastInfo}`}>Offer sent to seller</div>
            <div className={`${styles.toastItem} ${styles.toastError}`}>Payment failed</div>
          </div>
        </div>

        {/* Status Banners */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Status Banners</div>
          <div className={styles.bannerStack}>
            <InlineBanner variant="success" title="Identity verified — you can now sell on Nessi" />
            <InlineBanner variant="warning" title="Price dropped! Was $160 → now $140" />
            <InlineBanner variant="error" title="Payment could not be processed" />
          </div>
        </div>

        {/* Form Elements */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Form Elements</div>
          <FormDemo />
          <div className={styles.toggleRow} style={{ marginTop: '16px' }}>
            <div className={styles.toggleItem}>
              <Toggle
                id="toggle-offers"
                checked={toggleOffers}
                onChange={setToggleOffers}
                ariaLabel="Accept offers"
              />
              <span>Accept offers</span>
            </div>
            <div className={styles.toggleItem}>
              <Toggle
                id="toggle-pickup"
                checked={togglePickup}
                onChange={setTogglePickup}
                ariaLabel="Local pickup only"
              />
              <span>Local pickup only</span>
            </div>
          </div>
        </div>

        {/* Tabs & Accordion */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Tabs & Accordion</div>
          <div className={styles.tabsDemo}>
            <Tabs items={tabItems} activeIndex={activeTab} onChange={setActiveTab} />
          </div>

          <div>
            <div className={styles.accordionItem}>
              <span>Rod Action</span>
              <span>&#8744;</span>
            </div>
            <div className={styles.accordionContent}>
              Medium-fast action. Ideal for swimbaits and jerkbaits 3/8–1oz.
            </div>
            <div className={styles.accordionItem}>
              <span>Power</span>
              <span>&#8744;</span>
            </div>
            <div className={styles.accordionItem}>
              <span>Material</span>
              <span>&#8744;</span>
            </div>
          </div>
        </div>

        {/* DS Components: Controls */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Tooltips, Avatars & Steppers</div>
          <div className={styles.componentRow}>
            <Tooltip content="This is a tooltip">
              <Button style="secondary" outline>
                Hover me
              </Button>
            </Tooltip>
            <Avatar name="Kyle H" size="lg" />
            <Avatar name="Dan M" size="md" />
            <Avatar name="Caleb" size="sm" isShop />
            <Avatar name="R" size="xs" />
            <QuantityStepper value={qtyValue} onChange={setQtyValue} min={1} max={10} />
          </div>
        </div>

        {/* DS Components: Indicators */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Date, Location & Badges</div>
          <div className={styles.componentRow}>
            <DateTimeDisplay date={DEMO_NOW.toISOString()} format="relative" />
            <DateTimeDisplay date={DEMO_TOMORROW.toISOString()} format="countdown" urgent />
            <LocationChip location="Nashville, TN" variant="pill" />
            <LocationChip location="Local Pickup" variant="pickup" />
            <MemberBadge name="Early Adopter" icon="🎣" earned />
            <MemberBadge name="Top Seller" icon="⭐" earned={false} />
          </div>
        </div>

        {/* Notifications & Settings */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Notifications & Settings</div>
          <NotificationRow
            type="sale"
            title="Item Sold!"
            description="Shimano Stradic FL sold for $140"
            timestamp={DEMO_1H_AGO}
            isRead={false}
          />
          <NotificationRow
            type="offer"
            title="New Offer"
            description="Kyle H. offered $120 on your reel"
            timestamp={DEMO_2H_AGO}
            isRead
          />
          <div style={{ marginTop: '16px' }}>
            <SettingsRow
              label="Push Notifications"
              type="toggle"
              checked={settingsToggle}
              onChange={setSettingsToggle}
            />
            <SettingsRow label="Account Settings" type="nav" onClick={() => {}} />
            <SettingsRow label="Member since" type="display" value="March 2024" />
          </div>
        </div>

        {/* Layout Components */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>
            Layout: Page Header, Progress & Bottom Sheet
          </div>
          <PageHeader title="Listing Details" onBack={() => {}} />
          <div style={{ marginTop: '16px' }}>
            <ProgressBar value={3} max={5} label="Listing Progress" showPercentage />
          </div>
          <div style={{ marginTop: '16px' }}>
            <Button style="secondary" outline onClick={() => setSheetOpen(true)}>
              Open Bottom Sheet
            </Button>
          </div>
          {mounted && (
            <BottomSheet
              title="Shipping Options"
              isOpen={sheetOpen}
              onClose={() => setSheetOpen(false)}
            >
              <ShippingRateCard
                carrier="USPS"
                service="Priority Mail"
                price={895}
                eta="2-3 days"
                isSelected
                isFree={false}
              />
              <div style={{ marginTop: '8px' }}>
                <ShippingRateCard
                  carrier="UPS"
                  service="Ground"
                  price={1250}
                  eta="5-7 days"
                  isSelected={false}
                />
              </div>
            </BottomSheet>
          )}
        </div>

        {/* Error States */}
        <div className={styles.componentCard}>
          <div className={styles.componentCardLabel}>Error States</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ErrorState variant="inline" message="Could not load listings" />
            <ErrorState
              variant="banner"
              message="Connection Lost"
              description="Check your internet connection and try again."
              action={{ label: 'Retry', onClick: () => {} }}
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          04 — Commerce Components
          ════════════════════════════════════════════════════════════ */}
      <section id="commerce" className={styles.section}>
        <div className={styles.sectionNumber}>04 — Commerce</div>
        <h2 className={styles.sectionTitle}>Commerce Components</h2>
        <p className={styles.sectionDesc}>
          The components that drive the transaction: product cards, seller trust card, condition
          grading, spec table, offer UI, and fee calculator. These six patterns cover the full
          listing-to-purchase flow.
        </p>

        <div className={styles.commerceGrid}>
          {/* Product Cards */}
          <div>
            <div className={styles.componentCardLabel}>Product Cards</div>
            <div className={styles.productCardGrid}>
              <div className={styles.miniProductCard}>
                <div
                  className={styles.miniCardImage}
                  style={{ background: 'var(--color-primary-100)' }}
                >
                  <span className={styles.miniCardEmoji}>🎣</span>
                  <div
                    className={styles.miniCardBadge}
                    style={{ background: '#6BAD99', color: 'white' }}
                  >
                    V.Good
                  </div>
                  <span className={styles.miniCardHeart}>♥</span>
                </div>
                <div className={styles.miniCardBody}>
                  <div className={styles.miniCardPrice}>$140</div>
                  <div className={styles.miniCardTitle}>Shimano Stradic FL</div>
                  <div className={styles.miniCardSeller}>
                    Kyle H. <span className={styles.shopBadge}>Shop</span>
                  </div>
                </div>
              </div>

              <div className={styles.miniProductCard}>
                <div
                  className={styles.miniCardImage}
                  style={{ background: 'var(--color-surface-400)' }}
                >
                  <span className={styles.miniCardEmoji}>🧰</span>
                  <div
                    className={styles.miniCardBadge}
                    style={{ background: '#E27739', color: 'white' }}
                  >
                    Fair
                  </div>
                  <span className={styles.miniCardHeart}>♥</span>
                </div>
                <div className={styles.miniCardBody}>
                  <div className={styles.miniCardPrice}>$28</div>
                  <div className={styles.miniCardTitle}>Plano Edge Terminal</div>
                  <div className={styles.miniCardSeller}>D. Marcus</div>
                </div>
              </div>

              <div className={styles.miniProductCard}>
                <div
                  className={styles.miniCardImage}
                  style={{ background: 'var(--color-primary-100)' }}
                >
                  <span className={styles.miniCardEmoji}>🪝</span>
                  <div
                    className={styles.miniCardBadge}
                    style={{ background: 'var(--color-primary-500)', color: 'white' }}
                  >
                    New
                  </div>
                  <span className={styles.miniCardHeart}>♥</span>
                </div>
                <div className={styles.miniCardBody}>
                  <div className={styles.miniCardPrice}>$65</div>
                  <div className={styles.miniCardTitle}>Abu Garcia Revo SX</div>
                  <div className={styles.miniCardSeller}>Caleb&apos;s Gear</div>
                </div>
              </div>
            </div>
          </div>

          {/* Seller Card */}
          <div>
            <div className={styles.componentCardLabel}>Seller Card</div>
            <TrustStatRow
              sellerName="Kyle Holloway"
              rating={4.9}
              salesCount={327}
              responseTime="Ships in 24h"
              joinedDate="2023-06-15"
            />

            {/* Condition Track */}
            <div className={styles.componentCardLabel} style={{ marginTop: '24px' }}>
              Condition Track
            </div>
            <div className={styles.conditionTrack}>
              <div className={styles.conditionBar}>
                <div className={styles.conditionFill} style={{ width: '66%' }} />
              </div>
              <div className={styles.conditionDots}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`${styles.conditionDot} ${i <= 4 ? styles.active : ''}`}
                  />
                ))}
              </div>
              <div className={styles.conditionLabel}>Very Good — Tier 4 of 6</div>
              <div className={styles.conditionDesc}>
                Light use. No missing parts. Small cosmetic marks visible up close.
              </div>
            </div>
          </div>
        </div>

        <div className={styles.commerceGrid} style={{ marginTop: '24px' }}>
          {/* Spec Table */}
          <div>
            <div className={styles.componentCardLabel}>Spec Table</div>
            <SpecTable
              specs={[
                { key: 'Gear ratio', value: '6.0:1' },
                { key: 'Weight', value: '7.9 oz' },
                { key: 'Max drag', value: '24 lb' },
                { key: 'Bearings', value: '7+1 BB' },
                { key: 'Line capacity', value: '10lb / 120yd' },
              ]}
            />
          </div>

          {/* Offer UI & Fee Calculator */}
          <div>
            <div className={styles.componentCardLabel}>Offer UI & Fee Calculator</div>
            <OfferUI
              amount={12000}
              originalPrice={14000}
              expiresAt={DEMO_TOMORROW}
              status="pending"
              onAccept={() => {}}
              onDecline={() => {}}
              onCounter={() => {}}
            />
            <div style={{ marginTop: '16px' }}>
              <FeeCalculator price={14000} feeRate={0.045} />
            </div>
          </div>
        </div>

        {/* Price Display Variants */}
        <div className={styles.componentCard} style={{ marginTop: '24px' }}>
          <div className={styles.componentCardLabel}>Price Display Variants</div>
          <div className={styles.componentRow}>
            <PriceDisplay price={14000} />
            <PriceDisplay price={14000} originalPrice={16000} variant="price-drop" />
            <PriceDisplay price={14000} variant="below-avg" belowAvgLabel="Below market avg" />
            <PriceDisplay price={14000} watcherCount={12} />
          </div>
        </div>

        {/* Shipping & Categories */}
        <div className={styles.commerceGrid} style={{ marginTop: '24px' }}>
          <div>
            <div className={styles.componentCardLabel}>Shipping Rate Cards</div>
            <ShippingRateCard
              carrier="USPS"
              service="Priority Mail"
              price={895}
              eta="2-3 days"
              isSelected
            />
            <div style={{ marginTop: '8px' }}>
              <ShippingRateCard
                carrier="FedEx"
                service="Ground"
                price={0}
                eta="5-7 days"
                isSelected={false}
                isFree
              />
            </div>
          </div>
          <div>
            <div className={styles.componentCardLabel}>Category Tiles</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <CategoryTile
                name="Reels"
                image="/images/placeholder-reel.jpg"
                href="/search?cat=reels"
              />
              <CategoryTile
                name="Rods"
                image="/images/placeholder-rod.jpg"
                href="/search?cat=rods"
              />
              <CategoryTile
                name="Lures"
                image="/images/placeholder-lure.jpg"
                href="/search?cat=lures"
              />
            </div>
          </div>
        </div>

        {/* Messaging */}
        <div className={styles.componentCard} style={{ marginTop: '24px' }}>
          <div className={styles.componentCardLabel}>Message Thread & Offer Bubble</div>
          <div className={styles.commerceGrid}>
            <MessageThread
              messages={[
                {
                  id: '1',
                  senderId: 'other',
                  content: 'Hey, is this still available?',
                  timestamp: DEMO_2H_AGO,
                  type: 'text',
                },
                {
                  id: '2',
                  senderId: 'me',
                  content: "Yes! It's in great shape.",
                  timestamp: DEMO_1H_AGO,
                  type: 'text',
                },
                {
                  id: '3',
                  senderId: 'other',
                  content: 'Would you take $120?',
                  timestamp: DEMO_30M_AGO,
                  type: 'text',
                },
              ]}
              currentUserId="me"
            />
            <OfferBubble
              amount={12000}
              originalPrice={14000}
              expiresAt={DEMO_TOMORROW}
              status="pending"
              onAccept={() => {}}
              onCounter={() => {}}
              onDecline={() => {}}
            />
          </div>
        </div>

        {/* Order Timeline */}
        <div className={styles.componentCard} style={{ marginTop: '24px' }}>
          <div className={styles.componentCardLabel}>Order Timeline</div>
          <OrderTimeline
            steps={[
              { label: 'Order Placed', timestamp: new Date('2026-03-20T10:00:00Z') },
              { label: 'Payment Confirmed', timestamp: new Date('2026-03-20T10:05:00Z') },
              {
                label: 'Shipped',
                description: 'USPS Priority Mail',
                timestamp: new Date('2026-03-21T14:00:00Z'),
              },
              { label: 'Delivered' },
            ]}
            currentStep={2}
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          05 — Editorial: The Maker Layer
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.editorialSection}>
        <div className={styles.editorialInner}>
          <div className={styles.sectionNumber} style={{ color: 'rgba(255,255,255,0.4)' }}>
            05 — Editorial
          </div>
          <h2
            className={styles.sectionTitle}
            style={{ color: 'white', fontFamily: 'var(--font-family-serif)' }}
          >
            The Maker Layer
          </h2>
          <p className={styles.sectionDesc} style={{ color: 'rgba(255,255,255,0.6)' }}>
            Beyond commerce, Nessi has an editorial dimension: Maker Spotlight, Shop Highlight,
            Maker Story Block, and Species Browse Row. These components use the serif voice and
            full-bleed imagery to surface the craft behind the gear.
          </p>

          <div className={styles.editorialQuote}>
            &quot;Serif lives here — in the editorial moments, the maker stories, the species browse
            headers. Everywhere else: DM Sans, clean, functional, out of the way.&quot;
          </div>

          <ol className={styles.editorialList}>
            <li className={styles.editorialListItem}>
              <span className={styles.editorialListNum}>01</span>
              <span className={styles.editorialListText}>
                <strong>Maker Story Block</strong> — Serif headline, pull quote, narrative
                paragraph. Sanctioned serif moment.
              </span>
            </li>
            <li className={styles.editorialListItem}>
              <span className={styles.editorialListNum}>02</span>
              <span className={styles.editorialListText}>
                <strong>Shop Highlight</strong> — Full-bleed hero image with overlay gradient,
                fishing identity tags, 3-item preview grid.
              </span>
            </li>
            <li className={styles.editorialListItem}>
              <span className={styles.editorialListNum}>03</span>
              <span className={styles.editorialListText}>
                <strong>Species Browse Row</strong> — Horizontal scroll, circular species pills,
                deep-link entry points to filtered browse.
              </span>
            </li>
            <li className={styles.editorialListItem}>
              <span className={styles.editorialListNum}>04</span>
              <span className={styles.editorialListText}>
                <strong>Social Proof Strip</strong> — Green band, rotating live stats. Builds trust
                without cluttering the UI.
              </span>
            </li>
            <li className={styles.editorialListItem}>
              <span className={styles.editorialListNum}>05</span>
              <span className={styles.editorialListText}>
                <strong>Recently Sold Ticker</strong> — Auto-scrolling transactions. Proof of market
                activity, sandstone surface, live green dot.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          Live Editorial Components
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>05 — Editorial Components (Live)</div>
        <h2 className={styles.sectionTitle}>Editorial Components</h2>

        <SocialProofStrip
          variant="stats"
          stats={[
            { label: 'Total Listings', value: '12,480' },
            { label: 'Total Sales', value: '8,320' },
            { label: 'Active Sellers', value: '1,840' },
          ]}
        />

        <div style={{ marginTop: '24px' }}>
          <SocialProofStrip
            variant="activity"
            activity={{
              userName: 'Marcus',
              location: 'Austin, TX',
              itemName: 'Shimano Stradic FL',
              price: 14000,
              timeAgo: '2 min ago',
            }}
          />
        </div>

        <div style={{ marginTop: '24px' }}>
          <SpeciesBrowseRow
            species={[
              { id: '1', name: 'Bass', emoji: '🐟', isActive: true },
              { id: '2', name: 'Trout', emoji: '🐠', isActive: false },
              { id: '3', name: 'Walleye', emoji: '🐡', isActive: false },
              { id: '4', name: 'Catfish', emoji: '🐈', isActive: false },
              { id: '5', name: 'Pike', emoji: '🦈', isActive: false },
              { id: '6', name: 'Crappie', emoji: '🎣', isActive: false },
            ]}
            onSelect={() => {}}
          />
        </div>

        <div style={{ marginTop: '24px' }}>
          <RecentlySoldTicker
            sales={[
              {
                title: 'Shimano Stradic FL 2500',
                price: 14000,
                thumbnail: '/images/placeholder-reel.jpg',
                timeAgo: '2 min ago',
              },
              {
                title: 'G. Loomis NRX+ 7\'3"',
                price: 32000,
                thumbnail: '/images/placeholder-rod.jpg',
                timeAgo: '8 min ago',
              },
              {
                title: 'Rapala X-Rap (6-pack)',
                price: 4200,
                thumbnail: '/images/placeholder-lure.jpg',
                timeAgo: '15 min ago',
              },
            ]}
          />
        </div>

        <div style={{ marginTop: '24px' }}>
          <PriceDropAlert
            variant="banner"
            itemName="Shimano Stradic FL 2500"
            oldPrice={16000}
            newPrice={14000}
          />
        </div>

        <div style={{ marginTop: '12px' }}>
          <PriceDropAlert
            variant="saved-row"
            itemName="G. Loomis NRX+ 7'3&quot;"
            oldPrice={38000}
            newPrice={32000}
            thumbnail="/images/placeholder-rod.jpg"
          />
        </div>

        <div style={{ marginTop: '24px' }}>
          <FeaturedListingCard
            title="Shimano Stradic FL 2500"
            price={14000}
            sellerName="Kyle H."
            image="/images/placeholder-reel.jpg"
            conditionLabel="Very Good"
            conditionVariant="success"
            watcherCount={12}
            isFeatured
            href="/listing/1"
          />
        </div>

        <div style={{ marginTop: '24px' }}>
          <MakerStoryBlock
            quote="Every rod I build starts with a conversation about the water."
            author="Kyle Holloway"
            shopName="Holloway Custom Rods"
            image="/images/placeholder-rod.jpg"
            narrative="What started as a hobby in a Tennessee garage became a full-time craft. Kyle hand-wraps every guide, selects every blank, and tests each rod on his home waters before it ships."
            ctaLabel="Visit the shop"
            ctaHref="/shop/holloway-custom-rods"
          />
        </div>

        <div style={{ marginTop: '24px' }}>
          <ShopHighlight
            shopName="Holloway Custom Rods"
            location="Nashville, TN"
            heroImage="/images/placeholder-rod.jpg"
            quote="Built for the people who know their gear. Every rod hand-wrapped in Tennessee."
            identityTags={['Bass', 'Custom Rods', 'Handmade']}
            previewItems={[
              { price: 28000, image: '/images/placeholder-rod.jpg' },
              { price: 22000, image: '/images/placeholder-rod.jpg' },
              { price: 34000, image: '/images/placeholder-rod.jpg' },
            ]}
            rating={4.9}
            salesCount={327}
            shopUrl="/shop/holloway"
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          Dashboard Components
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>Bonus — Dashboard</div>
        <h2 className={styles.sectionTitle}>Dashboard Components</h2>

        <div className={styles.liveComponentsGrid}>
          <KpiStatTile
            label="Total Sales"
            value="$4,280"
            trend={{ direction: 'up', value: '+12%', period: 'vs last month' }}
          />
          <KpiStatTile
            label="Active Listings"
            value="23"
            trend={{ direction: 'flat', value: '0%', period: 'vs last month' }}
          />
          <KpiStatTile
            label="Return Rate"
            value="1.2%"
            trend={{ direction: 'down', value: '-0.3%', period: 'vs last month' }}
          />
        </div>

        <div className={styles.liveComponentsGrid} style={{ marginTop: '16px' }}>
          <QuickActionCard
            icon={<HiPlus />}
            label="New Listing"
            subtitle="List something for sale"
            href="/dashboard/listings/new"
          />
          <QuickActionCard
            icon={<HiInbox />}
            label="Messages"
            subtitle="3 unread"
            badge={3}
            href="/dashboard/messages"
          />
          <div className={styles.liveCard}>
            <div className={styles.liveCardLabel}>Sparkline</div>
            <Sparkline data={[12, 18, 14, 22, 28, 24, 30, 26, 32, 36, 28, 34]} />
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <ShopUpgradePrompt
            listingCount={15}
            totalSales={42}
            onUpgrade={() => {}}
            onDismiss={() => {}}
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          06 — Design Principles
          ════════════════════════════════════════════════════════════ */}
      <section id="principles" className={styles.section}>
        <div className={styles.sectionNumber}>06 — Principles</div>
        <h2 className={styles.sectionTitle}>Design Principles</h2>
        <p className={styles.sectionDesc}>
          Seven non-negotiables built into the token layer itself. They cannot be overridden without
          intentional effort — and that&apos;s the point.
        </p>

        <div className={styles.principlesGrid}>
          <div className={styles.principleItem}>
            <h4>Photo is the card</h4>
            <p>
              Product cards have no white box. The image is the card. Metadata floats on parchment
              beneath. Condition badge overlays the photo corner.
            </p>
          </div>
          <div className={styles.principleItem}>
            <h4>Serif is rare</h4>
            <p>
              DM Serif Display appears only in editorial sections, the wordmark, and select
              empty-state headlines. Never on product titles, nav, forms, or prices.
            </p>
          </div>
          <div className={styles.principleItem}>
            <h4>No raw white surfaces</h4>
            <p>
              Every surface uses a token: <code>--surface-page</code>, <code>--surface-raised</code>
              , <code>--surface-overlay</code>, <code>--surface-sunken</code>. The toggle knob is
              the one deliberate exception.
            </p>
          </div>
          <div className={styles.principleItem}>
            <h4>Guest-first commerce</h4>
            <p>
              Forced account creation drives 23% cart abandonment (Baymard, 500+ retailers, 2024).
              Guest flows first. Progressive registration post-purchase only.
            </p>
          </div>
          <div className={styles.principleItem}>
            <h4>Account isn&apos;t a tab</h4>
            <p>
              Bottom nav serves repeat journeys. Account is a destination, not a loop. It lives
              top-right as an avatar with an orange notification dot.
            </p>
          </div>
          <div className={styles.principleItem}>
            <h4>Sell is the throne</h4>
            <p>
              The Sell FAB is 48px burnt orange, floats 8px above the nav baseline, has no label.
              Visual weight signals primary action without competing with navigation.
            </p>
          </div>
          <div className={styles.principleItem}>
            <h4>Specs start expanded</h4>
            <p>
              Collapsing specs by default is a conversion killer. Gear buyers want the detail
              immediately. Accordion exists to tidy the page after first read.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          Footer CTA
          ════════════════════════════════════════════════════════════ */}
      <section className={styles.footerCta}>
        <h2 className={styles.footerTitle}>
          Built for the people
          <br />
          who know their gear.
        </h2>
        <p className={styles.footerDesc}>
          238 tokens. 237 components. One parchment background. A design system that feels like the
          sport it serves — considered, durable, and at home on the water.
        </p>
      </section>

      <footer className={styles.footerVersion}>Nessi Design System v2.1 · March 2026</footer>
    </div>
  );
}
