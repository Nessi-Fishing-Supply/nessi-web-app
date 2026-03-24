import type { RecentlyViewedItem } from '@/features/recently-viewed/types/recently-viewed';

export const STORAGE_KEY = 'nessi_recently_viewed';
export const MAX_ITEMS = 30;

const CUSTOM_EVENT = 'nessi_recently_viewed_change';

function readStorage(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: RecentlyViewedItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return readStorage();
}

export function addRecentlyViewed(listingId: string): void {
  if (typeof window === 'undefined') return;
  const items = readStorage();
  const filtered = items.filter((item) => item.listingId !== listingId);
  const newItem: RecentlyViewedItem = { listingId, viewedAt: new Date().toISOString() };
  const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
  writeStorage(updated);
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  writeStorage([]);
}

export function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener('storage', storageHandler);
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    window.removeEventListener('storage', storageHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}
