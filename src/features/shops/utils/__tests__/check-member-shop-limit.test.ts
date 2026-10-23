import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMemberShopLimit } from '../check-member-shop-limit';
import { MAX_SHOPS_PER_MEMBER } from '@/features/shops/constants/limits';

const mockSelect = vi.fn();

vi.mock('@/libs/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: mockSelect,
      }),
    }),
  }),
}));

describe('checkMemberShopLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns withinLimit true when member has 0 shops', async () => {
    mockSelect.mockResolvedValue({ count: 0, error: null });

    const result = await checkMemberShopLimit('user-123');

    expect(result).toEqual({
      withinLimit: true,
      currentCount: 0,
      maxCount: MAX_SHOPS_PER_MEMBER,
    });
  });

  it('returns withinLimit true when member has 3 shops', async () => {
    mockSelect.mockResolvedValue({ count: 3, error: null });

    const result = await checkMemberShopLimit('user-123');

    expect(result).toEqual({
      withinLimit: true,
      currentCount: 3,
      maxCount: MAX_SHOPS_PER_MEMBER,
    });
  });

  it('returns withinLimit false when member has exactly 5 shops', async () => {
    mockSelect.mockResolvedValue({ count: 5, error: null });

    const result = await checkMemberShopLimit('user-123');

    expect(result).toEqual({
      withinLimit: false,
      currentCount: 5,
      maxCount: MAX_SHOPS_PER_MEMBER,
    });
  });

  it('returns withinLimit false when member has 7 shops', async () => {
    mockSelect.mockResolvedValue({ count: 7, error: null });

    const result = await checkMemberShopLimit('user-123');

    expect(result).toEqual({
      withinLimit: false,
      currentCount: 7,
      maxCount: MAX_SHOPS_PER_MEMBER,
    });
  });

  it('treats null count as 0', async () => {
    mockSelect.mockResolvedValue({ count: null, error: null });

    const result = await checkMemberShopLimit('user-123');

    expect(result).toEqual({
      withinLimit: true,
      currentCount: 0,
      maxCount: MAX_SHOPS_PER_MEMBER,
    });
  });

  it('throws when Supabase returns an error', async () => {
    mockSelect.mockResolvedValue({
      count: null,
      error: { message: 'connection failed' },
    });

    await expect(checkMemberShopLimit('user-123')).rejects.toThrow(
      'Failed to check shop membership count: connection failed',
    );
  });

  it('maxCount always equals MAX_SHOPS_PER_MEMBER', () => {
    expect(MAX_SHOPS_PER_MEMBER).toBe(5);
  });
});
