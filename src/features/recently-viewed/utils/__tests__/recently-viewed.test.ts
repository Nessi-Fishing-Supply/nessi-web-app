import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEY,
  MAX_ITEMS,
  getRecentlyViewed,
  addRecentlyViewed,
  clearRecentlyViewed,
  subscribe,
} from '../recently-viewed';

beforeEach(() => {
  localStorage.clear();
});

describe('getRecentlyViewed', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('returns parsed items from localStorage', () => {
    const items = [
      { listingId: 'listing-1', viewedAt: '2026-01-01T00:00:00.000Z' },
      { listingId: 'listing-2', viewedAt: '2026-01-02T00:00:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    expect(getRecentlyViewed()).toEqual(items);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    expect(getRecentlyViewed()).toEqual([]);
  });
});

describe('addRecentlyViewed', () => {
  it('adds a single item to empty list', () => {
    addRecentlyViewed('listing-1');
    const items = getRecentlyViewed();
    expect(items).toHaveLength(1);
    expect(items[0].listingId).toBe('listing-1');
  });

  it('stores viewedAt as an ISO string', () => {
    addRecentlyViewed('listing-1');
    const items = getRecentlyViewed();
    expect(items[0].viewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(() => new Date(items[0].viewedAt)).not.toThrow();
  });

  it('deduplicates and moves existing item to front with updated viewedAt', () => {
    const firstTime = '2026-01-01T00:00:00.000Z';
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { listingId: 'listing-2', viewedAt: '2026-01-02T00:00:00.000Z' },
        { listingId: 'listing-1', viewedAt: firstTime },
      ]),
    );

    addRecentlyViewed('listing-1');
    const items = getRecentlyViewed();

    expect(items).toHaveLength(2);
    expect(items[0].listingId).toBe('listing-1');
    expect(items[1].listingId).toBe('listing-2');
    expect(items[0].viewedAt).not.toBe(firstTime);
  });

  it('caps list at 30 items and drops oldest from end', () => {
    const existing = Array.from({ length: MAX_ITEMS }, (_, i) => ({
      listingId: `listing-${i}`,
      viewedAt: new Date(i * 1000).toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    addRecentlyViewed('listing-new');
    const items = getRecentlyViewed();

    expect(items).toHaveLength(MAX_ITEMS);
    expect(items[0].listingId).toBe('listing-new');
    expect(items[MAX_ITEMS - 1].listingId).toBe(`listing-${MAX_ITEMS - 2}`);
  });

  it('dispatches nessi_recently_viewed_change custom event', () => {
    const listener = vi.fn();
    window.addEventListener('nessi_recently_viewed_change', listener);
    addRecentlyViewed('listing-1');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('nessi_recently_viewed_change', listener);
  });
});

describe('clearRecentlyViewed', () => {
  it('empties the list', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ listingId: 'listing-1', viewedAt: '2026-01-01T00:00:00.000Z' }]),
    );
    clearRecentlyViewed();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('is a no-op on already empty list', () => {
    clearRecentlyViewed();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('dispatches nessi_recently_viewed_change custom event', () => {
    const listener = vi.fn();
    window.addEventListener('nessi_recently_viewed_change', listener);
    clearRecentlyViewed();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('nessi_recently_viewed_change', listener);
  });
});

describe('subscribe', () => {
  it('calls callback on nessi_recently_viewed_change event', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    window.dispatchEvent(new CustomEvent('nessi_recently_viewed_change'));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('calls callback on storage event for nessi_recently_viewed key', () => {
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
    window.dispatchEvent(new CustomEvent('nessi_recently_viewed_change'));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(callback).not.toHaveBeenCalled();
  });

  it('addRecentlyViewed triggers subscribe callback via custom event', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);
    addRecentlyViewed('listing-1');
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
