import type { Database } from '@/types/database';

// Base types from database
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

// Status union types
export type OrderStatus =
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'verification'
  | 'released'
  | 'disputed'
  | 'refunded';
export type EscrowStatus = 'held' | 'released' | 'disputed' | 'refunded';
export type Carrier = 'USPS' | 'UPS' | 'FedEx' | 'DHL' | 'Other';

// Enriched order type with joined data (for list/detail views)
export type OrderWithListing = Order & {
  listing: {
    title: string;
    cover_photo_url: string | null;
  };
  buyer: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  seller: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    stripe_account_id: string | null;
  };
};

// Timeline step definition (used by OrderTimeline component)
export type TimelineStepDef = {
  key: OrderStatus;
  label: string;
  getDescription: (order: Order) => string | undefined;
};

// Timeline steps constant
export const TIMELINE_STEPS: TimelineStepDef[] = [
  {
    key: 'paid',
    label: 'Payment Confirmed',
    getDescription: (order) =>
      order.created_at
        ? `Paid on ${new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : undefined,
  },
  {
    key: 'shipped',
    label: 'Shipped',
    getDescription: (order) => {
      if (!order.shipped_at) return undefined;
      const parts = [
        `Shipped on ${new Date(order.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      ];
      if (order.carrier) parts.push(`via ${order.carrier}`);
      return parts.join(' ');
    },
  },
  {
    key: 'delivered',
    label: 'Delivered',
    getDescription: (order) =>
      order.delivered_at
        ? `Delivered on ${new Date(order.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : undefined,
  },
  {
    key: 'verification',
    label: 'Buyer Verification',
    getDescription: (order) => {
      if (order.verification_deadline) {
        const deadline = new Date(order.verification_deadline);
        const now = new Date();
        if (deadline > now) {
          const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `${days} day${days !== 1 ? 's' : ''} remaining to verify`;
        }
        return 'Verification window closed';
      }
      return '3-day window to confirm item arrived as described';
    },
  },
  {
    key: 'released',
    label: 'Funds Released',
    getDescription: (order) =>
      order.released_at
        ? `Released on ${new Date(order.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : undefined,
  },
];

// Status → Pill variant mapping for order cards
export const STATUS_PILL_MAP: Record<
  OrderStatus,
  'primary' | 'warning' | 'success' | 'error' | 'default'
> = {
  paid: 'primary',
  shipped: 'warning',
  delivered: 'success',
  verification: 'warning',
  released: 'success',
  disputed: 'error',
  refunded: 'default',
};

// Status display labels
export const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  verification: 'Verification',
  released: 'Released',
  disputed: 'Disputed',
  refunded: 'Refunded',
};
