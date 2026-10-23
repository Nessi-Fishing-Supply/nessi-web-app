import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEY,
  MAX_GUEST_CART_ITEMS,
  getGuestCart,
  getGuestCartCount,
  isInGuestCart,
  addToGuestCart,
  removeFromGuestCart,
  clearGuestCart,
  subscribe,
} from '../guest-cart';
import type { GuestCartItem } from '@/features/cart/types/cart';

function makeItem(listingId: string, overrides?: Partial<GuestCartItem>): GuestCartItem {
  return {
    listingId,
    priceAtAdd: 1000,
    addedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('getGuestCart', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(getGuestCart()).toEqual([]);
  });

  it('returns parsed items from localStorage', () => {
    const items = [makeItem('listing-1'), makeItem('listing-2')];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    expect(getGuestCart()).toEqual(items);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    expect(getGuestCart()).toEqual([]);
  });
});

describe('getGuestCartCount', () => {
  it('returns 0 when cart is empty', () => {
    expect(getGuestCartCount()).toBe(0);
  });

  it('returns correct count for multiple items', () => {
    const items = [makeItem('listing-1'), makeItem('listing-2'), makeItem('listing-3')];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    expect(getGuestCartCount()).toBe(3);
  });
});

describe('isInGuestCart', () => {
  it('returns false when cart is empty', () => {
    expect(isInGuestCart('listing-1')).toBe(false);
  });

  it('returns true when item is in cart', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem('listing-1')]));
    expect(isInGuestCart('listing-1')).toBe(true);
  });

  it('returns false when item is not in cart', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem('listing-1')]));
    expect(isInGuestCart('listing-2')).toBe(false);
  });
});

describe('addToGuestCart', () => {
  it('adds item to empty cart and returns "added"', () => {
    const item = makeItem('listing-1');
    const result = addToGuestCart(item);
    expect(result).toBe('added');
    expect(getGuestCart()).toEqual([item]);
  });

  it('adds item to existing cart and returns "added"', () => {
    const first = makeItem('listing-1');
    const second = makeItem('listing-2');
    addToGuestCart(first);
    const result = addToGuestCart(second);
    expect(result).toBe('added');
    expect(getGuestCart()).toHaveLength(2);
    expect(getGuestCart()[1]).toEqual(second);
  });

  it('enforces 25-item cap and returns "full"', () => {
    const items = Array.from({ length: MAX_GUEST_CART_ITEMS }, (_, i) => makeItem(`listing-${i}`));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    const result = addToGuestCart(makeItem('listing-overflow'));
    expect(result).toBe('full');
    expect(getGuestCartCount()).toBe(MAX_GUEST_CART_ITEMS);
    expect(isInGuestCart('listing-overflow')).toBe(false);
  });

  it('prevents duplicate listingId and returns "duplicate"', () => {
    const item = makeItem('listing-1');
    addToGuestCart(item);
    const result = addToGuestCart(makeItem('listing-1', { priceAtAdd: 9999 }));
    expect(result).toBe('duplicate');
    const cart = getGuestCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].priceAtAdd).toBe(1000);
  });

  it('dispatches nessi_cart_change custom event', () => {
    const listener = vi.fn();
    window.addEventListener('nessi_cart_change', listener);
    addToGuestCart(makeItem('listing-1'));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('nessi_cart_change', listener);
  });
});

describe('removeFromGuestCart', () => {
  it('removes item by listingId', () => {
    const items = [makeItem('listing-1'), makeItem('listing-2')];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    removeFromGuestCart('listing-1');
    const cart = getGuestCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].listingId).toBe('listing-2');
  });

  it('is a no-op for a non-existent listingId', () => {
    const items = [makeItem('listing-1')];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    removeFromGuestCart('listing-999');
    expect(getGuestCart()).toHaveLength(1);
  });

  it('dispatches nessi_cart_change custom event on removal', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem('listing-1')]));
    const listener = vi.fn();
    window.addEventListener('nessi_cart_change', listener);
    removeFromGuestCart('listing-1');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('nessi_cart_change', listener);
  });
});

describe('clearGuestCart', () => {
  it('empties the cart', () => {
    const items = [makeItem('listing-1'), makeItem('listing-2')];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    clearGuestCart();
    expect(getGuestCart()).toEqual([]);
  });

  it('is a no-op on already empty cart', () => {
    clearGuestCart();
    expect(getGuestCart()).toEqual([]);
  });

  it('dispatches nessi_cart_change custom event', () => {
    const listener = vi.fn();
    window.addEventListener('nessi_cart_change', listener);
    clearGuestCart();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('nessi_cart_change', listener);
  });
});

describe('subscribe', () => {
  it('calls callback on nessi_cart_change event', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    window.dispatchEvent(new CustomEvent('nessi_cart_change'));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('calls callback on storage event for nessi_cart key', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('calls callback on storage event with null key (localStorage.clear())', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('ignores storage events for other keys', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other_key' }));
    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('returns unsubscribe function that stops listening to both events', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    unsubscribe();
    window.dispatchEvent(new CustomEvent('nessi_cart_change'));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(callback).not.toHaveBeenCalled();
  });

  it('addToGuestCart triggers subscribe callback via custom event', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    addToGuestCart(makeItem('listing-1'));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
