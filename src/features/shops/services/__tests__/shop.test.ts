// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/libs/fetch', () => ({
  del: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

import { createClient } from '@/libs/supabase/client';
import { del, patch } from '@/libs/fetch';
import {
  getShop,
  getShopBySlug,
  getShopsByOwner,
  createShop,
  deleteShop,
  updateShop,
  checkShopSlugAvailable,
} from '../shop';

const mockShop = {
  id: 'shop-1',
  shop_name: 'Tackle Box',
  slug: 'tackle-box',
  description: 'Great fishing gear',
  owner_id: 'member-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  avatar_url: null,
  hero_banner_url: null,
  stripe_account_id: null,
  is_stripe_connected: false,
  stripe_onboarding_status: null,
  stripe_subscription_id: null,
  subscription_status: null,
  subscription_tier: null,
  average_rating: null,
  review_count: 0,
  total_transactions: 0,
  is_verified: false,
};

// ---------------------------------------------------------------------------
// getShop
// ---------------------------------------------------------------------------

describe('getShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the shop when found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockShop, error: null });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getShop('shop-1');

    expect(result).toEqual(mockShop);
    expect(mockFrom).toHaveBeenCalledWith('shops');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', 'shop-1');
  });

  it('returns null when shop is not found (PGRST116)', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found' } });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getShop('nonexistent');

    expect(result).toBeNull();
  });

  it('throws when Supabase returns a non-PGRST116 error', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: '42501', message: 'Permission denied' } });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(getShop('shop-1')).rejects.toThrow('Failed to fetch shop: Permission denied');
  });
});

// ---------------------------------------------------------------------------
// getShopBySlug
// ---------------------------------------------------------------------------

describe('getShopBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the shop when found by slug', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockShop, error: null });
    const mockIs = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getShopBySlug('tackle-box');

    expect(result).toEqual(mockShop);
    expect(mockFrom).toHaveBeenCalledWith('shops');
    expect(mockEq).toHaveBeenCalledWith('slug', 'tackle-box');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('returns null when shop is not found (PGRST116)', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found' } });
    const mockIs = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getShopBySlug('unknown-slug');

    expect(result).toBeNull();
  });

  it('filters soft-deleted shops via deleted_at IS NULL', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    const mockIs = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await getShopBySlug('deleted-shop');

    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('throws when Supabase returns a non-PGRST116 error', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: '42501', message: 'Permission denied' } });
    const mockIs = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(getShopBySlug('tackle-box')).rejects.toThrow(
      'Failed to fetch shop by slug: Permission denied',
    );
  });
});

// ---------------------------------------------------------------------------
// getShopsByOwner
// ---------------------------------------------------------------------------

describe('getShopsByOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of shops owned by a member', async () => {
    const mockIs = vi.fn().mockResolvedValue({ data: [mockShop], error: null });
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getShopsByOwner('member-1');

    expect(result).toEqual([mockShop]);
    expect(mockFrom).toHaveBeenCalledWith('shops');
    expect(mockEq).toHaveBeenCalledWith('owner_id', 'member-1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('throws when Supabase returns an error', async () => {
    const mockIs = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(getShopsByOwner('member-1')).rejects.toThrow(
      'Failed to fetch shops by owner: Database error',
    );
  });
});

// ---------------------------------------------------------------------------
// createShop
// ---------------------------------------------------------------------------

describe('createShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the created shop on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ shop: mockShop }), { status: 200 }),
    );

    const result = await createShop({
      shopName: 'Tackle Box',
      slug: 'tackle-box',
      description: 'Great fishing gear',
      ownerId: 'member-1',
    });

    expect(result).toEqual(mockShop);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/shops',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('throws the server error message when the response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Slug already taken' }), { status: 409 }),
    );

    await expect(
      createShop({
        shopName: 'Tackle Box',
        slug: 'tackle-box',
        ownerId: 'member-1',
      }),
    ).rejects.toThrow('Slug already taken');
  });

  it('throws a fallback error message when the response has no error field', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 500 }),
    );

    await expect(
      createShop({
        shopName: 'Tackle Box',
        slug: 'tackle-box',
        ownerId: 'member-1',
      }),
    ).rejects.toThrow('Failed to create shop');
  });
});

// ---------------------------------------------------------------------------
// deleteShop
// ---------------------------------------------------------------------------

describe('deleteShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls del with the correct API route', async () => {
    vi.mocked(del).mockResolvedValueOnce(undefined as any);

    await deleteShop('shop-1');

    expect(del).toHaveBeenCalledWith('/api/shops/shop-1');
    expect(del).toHaveBeenCalledOnce();
  });

  it('propagates errors thrown by del', async () => {
    vi.mocked(del).mockRejectedValueOnce(new Error('Not found'));

    await expect(deleteShop('shop-1')).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// updateShop
// ---------------------------------------------------------------------------

describe('updateShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes text fields through API and returns updated shop', async () => {
    const updatedShop = { ...mockShop, shop_name: 'Updated Tackle Box' };
    vi.mocked(patch).mockResolvedValueOnce(updatedShop);

    const result = await updateShop('shop-1', { shop_name: 'Updated Tackle Box' });

    expect(result).toEqual(updatedShop);
    expect(patch).toHaveBeenCalledWith('/api/shops/shop-1/profile', {
      shop_name: 'Updated Tackle Box',
    });
  });

  it('uses direct Supabase for non-text fields', async () => {
    const updatedShop = { ...mockShop, avatar_url: 'https://example.com/avatar.webp' };
    const mockSingle = vi.fn().mockResolvedValue({ data: updatedShop, error: null });
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ select: mockSelect }));
    const mockUpdate = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ update: mockUpdate }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await updateShop('shop-1', { avatar_url: 'https://example.com/avatar.webp' });

    expect(result).toEqual(updatedShop);
    expect(mockFrom).toHaveBeenCalledWith('shops');
    expect(patch).not.toHaveBeenCalled();
  });

  it('throws when API call fails for text fields', async () => {
    vi.mocked(patch).mockRejectedValueOnce(new Error('Row not found'));

    await expect(updateShop('shop-1', { shop_name: 'New Name' })).rejects.toThrow('Row not found');
  });

  it('throws when Supabase fails for non-text fields', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Row not found' } });
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockEq = vi.fn(() => ({ select: mockSelect }));
    const mockUpdate = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ update: mockUpdate }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(
      updateShop('shop-1', { avatar_url: 'https://example.com/avatar.webp' }),
    ).rejects.toThrow('Failed to update shop: Row not found');
  });
});

// ---------------------------------------------------------------------------
// checkShopSlugAvailable
// ---------------------------------------------------------------------------

describe('checkShopSlugAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the slug is available (empty result set)', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn(() => ({ limit: mockLimit }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await checkShopSlugAvailable('new-slug');

    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('slugs');
    expect(mockSelect).toHaveBeenCalledWith('slug');
    expect(mockEq).toHaveBeenCalledWith('slug', 'new-slug');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it('returns false when the slug is taken (non-empty result set)', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [{ slug: 'tackle-box' }], error: null });
    const mockEq = vi.fn(() => ({ limit: mockLimit }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await checkShopSlugAvailable('tackle-box');

    expect(result).toBe(false);
  });

  it('throws when Supabase returns an error', async () => {
    const mockLimit = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Table not found' } });
    const mockEq = vi.fn(() => ({ limit: mockLimit }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(checkShopSlugAvailable('some-slug')).rejects.toThrow(
      'Failed to check shop slug availability: Table not found',
    );
  });
});
