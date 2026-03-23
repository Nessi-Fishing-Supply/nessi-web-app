import type { ListingStatus } from '../types/listing';

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  reserved: 'Reserved',
  sold: 'Sold',
  archived: 'Deactivated',
  deleted: 'Deleted',
};

export const LISTING_STATUS_COLORS: Record<
  ListingStatus,
  'success' | 'default' | 'primary' | 'warning' | 'error' | 'secondary'
> = {
  draft: 'default',
  active: 'success',
  reserved: 'primary',
  sold: 'primary',
  archived: 'warning',
  deleted: 'error',
};

/** Status values visible in the dashboard tabs (excludes deleted) */
export const DASHBOARD_STATUS_TABS = ['all', 'active', 'draft', 'sold', 'archived'] as const;

export type DashboardStatusTab = (typeof DASHBOARD_STATUS_TABS)[number];

export const DASHBOARD_TAB_LABELS: Record<DashboardStatusTab, string> = {
  all: 'All',
  active: 'Active',
  draft: 'Drafts',
  sold: 'Sold',
  archived: 'Deactivated',
};
