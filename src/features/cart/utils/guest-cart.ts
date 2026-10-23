import type { GuestCartItem } from '@/features/cart/types/cart';

export const STORAGE_KEY = 'nessi_cart';
export const MAX_GUEST_CART_ITEMS = 25;

const CUSTOM_EVENT = 'nessi_cart_change';

function readStorage(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestCartItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: GuestCartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function getGuestCart(): GuestCartItem[] {
  return readStorage();
}

export function getGuestCartCount(): number {
  return readStorage().length;
}

export function isInGuestCart(listingId: string): boolean {
  return readStorage().some((item) => item.listingId === listingId);
}

export type AddToGuestCartResult = 'added' | 'full' | 'duplicate';

export function addToGuestCart(item: GuestCartItem): AddToGuestCartResult {
  if (typeof window === 'undefined') return 'added';
  const items = readStorage();
  if (items.length >= MAX_GUEST_CART_ITEMS) return 'full';
  if (items.some((i) => i.listingId === item.listingId)) return 'duplicate';
  writeStorage([...items, item]);
  return 'added';
}

export function removeFromGuestCart(listingId: string): void {
  if (typeof window === 'undefined') return;
  const items = readStorage();
  writeStorage(items.filter((item) => item.listingId !== listingId));
}

export function clearGuestCart(): void {
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
