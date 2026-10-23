// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/libs/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/libs/fetch', () => ({
  post: vi.fn(),
}));

import { createClient } from '@/libs/supabase/client';
import { post } from '@/libs/fetch';
import {
  getMember,
  getMemberBySlug,
  updateMember,
  checkSlugAvailable,
  completeOnboarding,
} from '../member';

const mockMember = {
  id: 'user-123',
  first_name: 'Jane',
  last_name: 'Doe',
  slug: 'jane-doe-1234',
  bio: null,
  avatar_url: null,
  is_seller: false,
  onboarding_completed_at: null,
  home_state: null,
  primary_species: null,
  primary_technique: null,
  years_fishing: null,
  notification_preferences: null,
  deleted_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  stripe_account_id: null,
  is_stripe_connected: false,
  stripe_onboarding_status: null,
  average_rating: null,
  review_count: 0,
  total_transactions: 0,
  last_seen_at: null,
  response_time_hours: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getMember', () => {
  it('returns a member on success', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockMember, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getMember('user-123');

    expect(result).toEqual(mockMember);
    expect(mockFrom).toHaveBeenCalledWith('members');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('returns null when member is not found (PGRST116)', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getMember('nonexistent-user');

    expect(result).toBeNull();
  });

  it('throws an error on unexpected Supabase error', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: '500', message: 'Database error' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(getMember('user-123')).rejects.toThrow('Failed to fetch member: Database error');
  });
});

describe('getMemberBySlug', () => {
  it('returns a member on success', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: mockMember, error: null });
    const mockIs = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getMemberBySlug('jane-doe-1234');

    expect(result).toEqual(mockMember);
    expect(mockFrom).toHaveBeenCalledWith('members');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('slug', 'jane-doe-1234');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('returns null when no member matches the slug (PGRST116)', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found' } });
    const mockIs = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await getMemberBySlug('nonexistent-slug');

    expect(result).toBeNull();
  });

  it('filters soft-deleted members via is("deleted_at", null)', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockIs = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await getMemberBySlug('deleted-member-slug');

    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('throws an error on unexpected Supabase error', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: '500', message: 'Connection failed' } });
    const mockIs = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(getMemberBySlug('jane-doe-1234')).rejects.toThrow(
      'Failed to fetch member by slug: Connection failed',
    );
  });
});

describe('updateMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes text fields through API and returns updated member', async () => {
    const updatedMember = { ...mockMember, bio: 'I love fishing' };
    vi.mocked(post).mockResolvedValueOnce(updatedMember);

    const result = await updateMember('user-123', { bio: 'I love fishing' });

    expect(result).toEqual(updatedMember);
    expect(post).toHaveBeenCalledWith('/api/members/profile', { bio: 'I love fishing' });
  });

  it('uses direct Supabase for non-text fields', async () => {
    const updatedMember = { ...mockMember, home_state: 'TX' };
    const mockSingle = vi.fn().mockResolvedValue({ data: updatedMember, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await updateMember('user-123', { home_state: 'TX' });

    expect(result).toEqual(updatedMember);
    expect(mockFrom).toHaveBeenCalledWith('members');
    expect(mockUpdate).toHaveBeenCalledWith({ home_state: 'TX' });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    expect(post).not.toHaveBeenCalled();
  });

  it('throws when API call fails for text fields', async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error('Update rejected'));

    await expect(updateMember('user-123', { bio: 'I love fishing' })).rejects.toThrow(
      'Update rejected',
    );
  });

  it('throws when Supabase fails for non-text fields', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Update rejected' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(updateMember('user-123', { home_state: 'TX' })).rejects.toThrow(
      'Failed to update member: Update rejected',
    );
  });
});

describe('checkSlugAvailable', () => {
  it('returns true when the slug is available', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.mocked(createClient).mockReturnValue({ rpc: mockRpc } as any);

    const result = await checkSlugAvailable('new-unique-slug');

    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('check_slug_available', { p_slug: 'new-unique-slug' });
  });

  it('returns false when the slug is already taken', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: false, error: null });
    vi.mocked(createClient).mockReturnValue({ rpc: mockRpc } as any);

    const result = await checkSlugAvailable('taken-slug');

    expect(result).toBe(false);
  });

  it('throws an error when the RPC call fails', async () => {
    const mockRpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'RPC function not found' } });
    vi.mocked(createClient).mockReturnValue({ rpc: mockRpc } as any);

    await expect(checkSlugAvailable('some-slug')).rejects.toThrow(
      'Failed to check slug availability: RPC function not found',
    );
  });
});

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls updateMember with onboarding_completed_at set to current ISO timestamp', async () => {
    const completedMember = {
      ...mockMember,
      onboarding_completed_at: '2024-06-15T12:00:00.000Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: completedMember, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    const result = await completeOnboarding('user-123');

    expect(result).toEqual(completedMember);
    expect(mockUpdate).toHaveBeenCalledWith({
      onboarding_completed_at: '2024-06-15T12:00:00.000Z',
    });
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('throws when the underlying updateMember call fails', async () => {
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

    await expect(completeOnboarding('user-123')).rejects.toThrow(
      'Failed to update member: Permission denied',
    );
  });
});
