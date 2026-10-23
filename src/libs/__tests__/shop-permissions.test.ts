// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { requireShopPermission, getShopMemberWithRole } from '../shop-permissions';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/libs/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
  ),
}));

vi.mock('@/libs/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    })),
  })),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockShopId = 'shop-456';

const mockOwnerRole = {
  id: '11111111-1111-1111-1111-111111111101',
  name: 'Owner',
  slug: 'owner',
  is_system: true,
  shop_id: null,
  permissions: {
    listings: 'full',
    pricing: 'full',
    orders: 'full',
    messaging: 'full',
    shop_settings: 'full',
    members: 'full',
  },
  created_at: '2026-01-01',
};

const mockManagerRole = {
  id: '11111111-1111-1111-1111-111111111102',
  name: 'Manager',
  slug: 'manager',
  is_system: true,
  shop_id: null,
  permissions: {
    listings: 'full',
    pricing: 'full',
    orders: 'full',
    messaging: 'full',
    shop_settings: 'view',
    members: 'none',
  },
  created_at: '2026-01-01',
};

const mockMemberRow = {
  id: 'sm-789',
  shop_id: mockShopId,
  member_id: 'user-123',
  role_id: '11111111-1111-1111-1111-111111111102',
  created_at: '2026-01-01',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(contextHeader?: string): Request {
  const headers = new Headers();
  if (contextHeader) {
    headers.set('X-Nessi-Context', contextHeader);
  }
  return new Request('http://localhost/api/test', { headers });
}

// ---------------------------------------------------------------------------
// Tests: requireShopPermission
// ---------------------------------------------------------------------------

describe('requireShopPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when getUser() returns no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'listings',
      'full',
    );

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 403 when X-Nessi-Context header is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    const result = await requireShopPermission(createRequest(), 'listings', 'full');

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when X-Nessi-Context header is member (not shop context)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    const result = await requireShopPermission(createRequest('member'), 'listings', 'full');

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when user is not a shop member (query returns error)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'listings',
      'full',
    );

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when user has insufficient permission (manager has view for shop_settings but full required)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: { ...mockMemberRow, shop_roles: mockManagerRole },
      error: null,
    });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'shop_settings',
      'full',
    );

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns success with user+shopId+member when permission is sufficient (manager has full for listings, full required)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: { ...mockMemberRow, shop_roles: mockManagerRole },
      error: null,
    });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'listings',
      'full',
    );

    expect(result instanceof NextResponse).toBe(false);
    const success = result as { user: typeof mockUser; shopId: string; member: unknown };
    expect(success.user).toEqual(mockUser);
    expect(success.shopId).toBe(mockShopId);
    expect(success.member).toBeDefined();
  });

  it('returns success when user has full and only view is required (higher level passes)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: { ...mockMemberRow, shop_roles: mockManagerRole },
      error: null,
    });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'listings',
      'view',
    );

    expect(result instanceof NextResponse).toBe(false);
    const success = result as { user: typeof mockUser; shopId: string; member: unknown };
    expect(success.user).toEqual(mockUser);
    expect(success.shopId).toBe(mockShopId);
  });

  it('returns 403 when user permission is none and view is required', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: { ...mockMemberRow, shop_roles: mockManagerRole },
      error: null,
    });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'members',
      'view',
    );

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when expectedShopId does not match context header shopId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: { ...mockMemberRow, shop_roles: mockManagerRole },
      error: null,
    });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'listings',
      'full',
      { expectedShopId: 'different-shop-id' },
    );

    expect(result instanceof NextResponse).toBe(true);
    expect((result as NextResponse).status).toBe(403);
  });

  it('owner bypass: returns success even when checking any feature/level because role has is_system: true and slug: owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockSingle.mockResolvedValue({
      data: {
        ...mockMemberRow,
        role_id: '11111111-1111-1111-1111-111111111101',
        shop_roles: mockOwnerRole,
      },
      error: null,
    });

    const result = await requireShopPermission(
      createRequest(`shop:${mockShopId}`),
      'members',
      'full',
    );

    expect(result instanceof NextResponse).toBe(false);
    const success = result as { user: typeof mockUser; shopId: string; member: unknown };
    expect(success.user).toEqual(mockUser);
    expect(success.shopId).toBe(mockShopId);
  });
});

// ---------------------------------------------------------------------------
// Tests: getShopMemberWithRole
// ---------------------------------------------------------------------------

describe('getShopMemberWithRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no matching shop_members row (query returns error)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getShopMemberWithRole('user-123', 'shop-456');

    expect(result).toBeNull();
  });

  it('returns the member+role data when found with properly typed permissions', async () => {
    mockSingle.mockResolvedValue({
      data: { ...mockMemberRow, shop_roles: mockManagerRole },
      error: null,
    });

    const result = await getShopMemberWithRole('user-123', mockShopId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(mockMemberRow.id);
    expect(result!.shop_id).toBe(mockShopId);
    expect(result!.member_id).toBe('user-123');
    expect(result!.shop_roles.slug).toBe('manager');
    expect(result!.shop_roles.permissions.listings).toBe('full');
    expect(result!.shop_roles.permissions.shop_settings).toBe('view');
  });
});
