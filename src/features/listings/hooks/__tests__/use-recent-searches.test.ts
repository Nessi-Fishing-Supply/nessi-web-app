import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentSearches } from '../use-recent-searches';

const STORAGE_KEY = 'nessi-recent-searches';

beforeEach(() => {
  localStorage.clear();
});

describe('useRecentSearches', () => {
  it('returns empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('returns parsed items from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['shimano', 'fly rod']));
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual(['shimano', 'fly rod']);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('adds a search term', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('shimano'));
    expect(result.current.recentSearches).toEqual(['shimano']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['shimano']);
  });

  it('moves duplicate to front', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['rod', 'reel', 'lure']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('reel'));
    expect(result.current.recentSearches).toEqual(['reel', 'rod', 'lure']);
  });

  it('caps at 5 entries, evicting oldest', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['a', 'b', 'c', 'd', 'e']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('f'));
    expect(result.current.recentSearches).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(result.current.recentSearches).toHaveLength(5);
  });

  it('trims whitespace and ignores empty terms', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('  '));
    expect(result.current.recentSearches).toEqual([]);
    act(() => result.current.addRecentSearch('  shimano  '));
    expect(result.current.recentSearches).toEqual(['shimano']);
  });

  it('removes a specific term', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['rod', 'reel', 'lure']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.removeRecentSearch('reel'));
    expect(result.current.recentSearches).toEqual(['rod', 'lure']);
  });

  it('clears all searches', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['rod', 'reel']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.clearRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
