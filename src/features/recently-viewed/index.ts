// Types
export type { RecentlyViewedItem } from './types/recently-viewed';

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
