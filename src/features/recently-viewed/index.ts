// Types
export type { RecentlyViewedItem, RecentlyViewedListingItem } from './types/recently-viewed';

// Utils
export {
  getRecentlyViewed,
  addRecentlyViewed,
  clearRecentlyViewed,
  subscribe,
  STORAGE_KEY,
  MAX_ITEMS,
} from './utils/recently-viewed';

// Hooks
export { useRecentlyViewed } from './hooks/use-recently-viewed';
export {
  useRecentlyViewedQuery,
  useClearRecentlyViewed,
  useMergeGuestViews,
} from './hooks/use-recently-viewed-query';
export { useRecentlyViewedMerge } from './hooks/use-recently-viewed-merge';
export { useRecentlyViewedListings } from './hooks/use-recently-viewed-listings';

// Components
export { default as RecentlyViewedStrip } from './components/recently-viewed-strip';

// Services
export {
  getRecentlyViewedFromServer,
  clearRecentlyViewedOnServer,
  mergeGuestViewsOnServer,
} from './services/recently-viewed';
