import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentlyViewed } from '../use-recently-viewed';
import { STORAGE_KEY } from '@/features/recently-viewed/utils/recently-viewed';
import type { RecentlyViewedItem } from '@/features/recently-viewed/types/recently-viewed';

// Mock auth — tests exercise the guest (unauthenticated) path
vi.mock('@/features/auth/context', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

// Mock Tanstack Query hooks — not exercised in guest path
vi.mock('../use-recently-viewed-query', () => ({
  useRecentlyViewedQuery: () => ({ data: undefined }),
  useClearRecentlyViewed: () => ({ mutate: vi.fn() }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('useRecentlyViewed', () => {
  it('returns empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.items).toEqual([]);
  });

  it('returns parsed items from localStorage', () => {
    const items: RecentlyViewedItem[] = [
      { listingId: 'listing-1', viewedAt: '2024-01-01T00:00:00.000Z' },
      { listingId: 'listing-2', viewedAt: '2024-01-02T00:00:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.items).toEqual(items);
  });

  it('add records a listing and updates items', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.add('listing-1'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].listingId).toBe('listing-1');
  });

  it('adding same listing twice deduplicates and moves to front with updated timestamp', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.add('listing-1'));
    act(() => result.current.add('listing-2'));
    act(() => result.current.add('listing-1'));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].listingId).toBe('listing-1');
    expect(result.current.items[1].listingId).toBe('listing-2');
    expect(result.current.items[0].viewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('clear empties the list', () => {
    const items: RecentlyViewedItem[] = [
      { listingId: 'listing-1', viewedAt: '2024-01-01T00:00:00.000Z' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
  });
});
