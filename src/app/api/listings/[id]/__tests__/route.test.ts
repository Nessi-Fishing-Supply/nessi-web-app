// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../route';

vi.mock('@/libs/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/libs/supabase/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(id = 'test-listing-id') {
  return { params: Promise.resolve({ id }) };
}

function makePutRequest(body: object, id = 'test-listing-id') {
  return new Request(`http://localhost/api/listings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const activeListing = {
  id: 'test-listing-id',
  seller_id: 'user-123',
  title: 'Test Rod',
  status: 'active',
  deleted_at: null,
  listing_photos: [],
};

const draftListing = {
  ...activeListing,
  status: 'draft',
};

// ---------------------------------------------------------------------------
// GET /api/listings/[id]
// ---------------------------------------------------------------------------

describe('GET /api/listings/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns listing when found and active', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: activeListing, error: null }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: vi.fn() },
      storage: { from: vi.fn() },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/listings/test-listing-id'),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('test-listing-id');
    expect(body.status).toBe('active');
  });

  it('returns 404 when not found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } }),
            }),
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: vi.fn() },
      storage: { from: vi.fn() },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/listings/missing-id'),
      makeContext('missing-id'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Listing not found' });
  });

  it('returns 404 for draft listing when user is not the owner', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: draftListing, error: null }),
            }),
          }),
        }),
      }),
    });

    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'other-user-999' } } });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/listings/test-listing-id'),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Listing not found' });
  });

  it('returns draft listing when user IS the owner', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: draftListing, error: null }),
            }),
          }),
        }),
      }),
    });

    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/listings/test-listing-id'),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('draft');
    expect(body.seller_id).toBe('user-123');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/listings/[id]
// ---------------------------------------------------------------------------

describe('PUT /api/listings/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(),
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await PUT(makePutRequest({ title: 'Updated' }), makeContext());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 404 when listing not found', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });

    // First from() call: fetch existing listing — not found
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await PUT(makePutRequest({ title: 'Updated' }), makeContext());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Listing not found' });
  });

  it('returns 403 when user is not the seller', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'intruder-999' } } });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-123' }, error: null }),
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await PUT(makePutRequest({ title: 'Updated' }), makeContext());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden' });
  });

  it('filters out disallowed fields (e.g. seller_id is stripped)', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    // Track calls per table so we can return the right data for the re-fetch
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                // First call: ownership check; second call: re-fetch after update
                single: vi
                  .fn()
                  .mockResolvedValueOnce({ data: { seller_id: 'user-123' }, error: null })
                  .mockResolvedValueOnce({ data: activeListing, error: null }),
                order: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: activeListing, error: null }),
                }),
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await PUT(
      makePutRequest({ title: 'New Title', seller_id: 'evil-override', status: 'active' }),
      makeContext(),
    );

    expect(response.status).toBe(200);

    // update() should have been called without disallowed fields
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ seller_id: expect.anything() }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
  });

  it('returns 400 when no valid fields provided', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-123' }, error: null }),
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    // Only disallowed fields — none will pass the whitelist filter
    const response = await PUT(
      makePutRequest({ seller_id: 'hax', deleted_at: 'now' }),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'No valid fields to update' });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/listings/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/listings/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(),
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await DELETE(
      new Request('http://localhost/api/listings/test-listing-id'),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user is not the seller', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'intruder-999' } } });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-123' }, error: null }),
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn() },
    } as any);

    const response = await DELETE(
      new Request('http://localhost/api/listings/test-listing-id'),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden' });
  });

  it('successfully soft-deletes the listing', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const mockStorageRemove = vi.fn().mockResolvedValue({ data: null, error: null });

    // Track call count to distinguish ownership-fetch from photos-fetch
    let fromCallCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'listing_photos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }

      // listings table
      fromCallCount++;
      if (fromCallCount === 1) {
        // Ownership fetch
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-123' }, error: null }),
              }),
            }),
          }),
        };
      }

      // Soft-delete update
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
      storage: { from: vi.fn().mockReturnValue({ remove: mockStorageRemove }) },
    } as any);

    const response = await DELETE(
      new Request('http://localhost/api/listings/test-listing-id'),
      makeContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
  });
});
