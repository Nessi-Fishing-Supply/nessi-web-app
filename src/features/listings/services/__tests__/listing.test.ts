// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/fetch', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  patch: vi.fn(),
}));

import { get, post, put, del, patch } from '@/libs/fetch';
import {
  getListings,
  getListingById,
  getSellerListings,
  getDrafts,
  createListing,
  createDraft,
  updateListing,
  deleteListing,
  deleteDraft,
  updateListingStatus,
  incrementViewCount,
} from '../listing';

const BASE_URL = '/api/listings';

const mockListing = {
  id: 'listing-1',
  title: 'Abu Garcia Reel',
  price_cents: 4999,
  status: 'active',
  category: 'reels',
  condition: 'good',
  seller_id: 'user-1',
  member_id: 'member-1',
  shop_id: null,
  cover_photo_url: null,
  photos: [],
};

const mockPaginatedListings = {
  listings: [mockListing],
  total: 1,
  page: 1,
  limit: 20,
};

// ---------------------------------------------------------------------------
// getListings
// ---------------------------------------------------------------------------

describe('getListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get with the base URL when no filters are provided', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings();

    expect(get).toHaveBeenCalledWith(BASE_URL);
    expect(get).toHaveBeenCalledOnce();
  });

  it('calls get with the base URL when an empty filters object is provided', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({});

    expect(get).toHaveBeenCalledWith(BASE_URL);
  });

  it('appends category filter as a query param', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ category: 'reels' });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?category=reels`);
  });

  it('appends condition filter as a query param', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ condition: 'good' });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?condition=good`);
  });

  it('appends search filter as a query param', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ search: 'abu garcia' });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?search=abu+garcia`);
  });

  it('appends minPrice and maxPrice as query params', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ minPrice: 500, maxPrice: 10000 });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?minPrice=500&maxPrice=10000`);
  });

  it('appends minPrice of 0 as a query param', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ minPrice: 0 });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?minPrice=0`);
  });

  it('appends sort filter as a query param', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ sort: 'price_asc' });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?sort=price_asc`);
  });

  it('appends page and limit as query params', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ page: 2, limit: 10 });

    expect(get).toHaveBeenCalledWith(`${BASE_URL}?page=2&limit=10`);
  });

  it('appends multiple filters together', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    await getListings({ category: 'rods', condition: 'like_new', sort: 'newest', page: 1 });

    expect(get).toHaveBeenCalledWith(
      `${BASE_URL}?category=rods&condition=like_new&sort=newest&page=1`,
    );
  });

  it('returns the paginated listings response', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockPaginatedListings as any);

    const result = await getListings();

    expect(result).toEqual(mockPaginatedListings);
  });

  it('propagates errors thrown by get', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('Network error'));

    await expect(getListings()).rejects.toThrow('Network error');
  });
});

// ---------------------------------------------------------------------------
// getListingById
// ---------------------------------------------------------------------------

describe('getListingById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get with the correct URL including the listing ID', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockListing as any);

    await getListingById('listing-1');

    expect(get).toHaveBeenCalledWith(`${BASE_URL}/listing-1`);
    expect(get).toHaveBeenCalledOnce();
  });

  it('returns the listing with photos', async () => {
    vi.mocked(get).mockResolvedValueOnce(mockListing as any);

    const result = await getListingById('listing-1');

    expect(result).toEqual(mockListing);
  });

  it('propagates errors thrown by get', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('Not found'));

    await expect(getListingById('missing-id')).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// createListing
// ---------------------------------------------------------------------------

describe('createListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls post with the base URL and the listing data', async () => {
    vi.mocked(post).mockResolvedValueOnce(mockListing as any);

    const data = { title: 'Abu Garcia Reel', price_cents: 4999, category: 'reels' };
    await createListing(data);

    expect(post).toHaveBeenCalledWith(BASE_URL, data);
    expect(post).toHaveBeenCalledOnce();
  });

  it('returns the created listing', async () => {
    vi.mocked(post).mockResolvedValueOnce(mockListing as any);

    const result = await createListing({ title: 'Abu Garcia Reel' });

    expect(result).toEqual(mockListing);
  });

  it('propagates errors thrown by post', async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error('Validation error'));

    await expect(createListing({ title: '' })).rejects.toThrow('Validation error');
  });
});

// ---------------------------------------------------------------------------
// updateListing
// ---------------------------------------------------------------------------

describe('updateListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls put with the correct URL and updated data', async () => {
    const updatedListing = { ...mockListing, title: 'Updated Reel' };
    vi.mocked(put).mockResolvedValueOnce(updatedListing as any);

    await updateListing('listing-1', { title: 'Updated Reel' });

    expect(put).toHaveBeenCalledWith(`${BASE_URL}/listing-1`, { title: 'Updated Reel' });
    expect(put).toHaveBeenCalledOnce();
  });

  it('returns the updated listing', async () => {
    const updatedListing = { ...mockListing, price_cents: 3999 };
    vi.mocked(put).mockResolvedValueOnce(updatedListing as any);

    const result = await updateListing('listing-1', { price_cents: 3999 });

    expect(result).toEqual(updatedListing);
  });

  it('propagates errors thrown by put', async () => {
    vi.mocked(put).mockRejectedValueOnce(new Error('Forbidden'));

    await expect(updateListing('listing-1', { title: 'New Title' })).rejects.toThrow('Forbidden');
  });
});

// ---------------------------------------------------------------------------
// deleteListing
// ---------------------------------------------------------------------------

describe('deleteListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls del with the correct URL', async () => {
    vi.mocked(del).mockResolvedValueOnce({ success: true } as any);

    await deleteListing('listing-1');

    expect(del).toHaveBeenCalledWith(`${BASE_URL}/listing-1`);
    expect(del).toHaveBeenCalledOnce();
  });

  it('returns the success response', async () => {
    vi.mocked(del).mockResolvedValueOnce({ success: true } as any);

    const result = await deleteListing('listing-1');

    expect(result).toEqual({ success: true });
  });

  it('propagates errors thrown by del', async () => {
    vi.mocked(del).mockRejectedValueOnce(new Error('Not found'));

    await expect(deleteListing('missing-id')).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// updateListingStatus
// ---------------------------------------------------------------------------

describe('updateListingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls patch with the correct URL and status body', async () => {
    const activeListing = { ...mockListing, status: 'active' };
    vi.mocked(patch).mockResolvedValueOnce(activeListing as any);

    await updateListingStatus('listing-1', 'active');

    expect(patch).toHaveBeenCalledWith(`${BASE_URL}/listing-1/status`, { status: 'active' });
    expect(patch).toHaveBeenCalledOnce();
  });

  it('includes sold_price_cents in the body when provided', async () => {
    const soldListing = { ...mockListing, status: 'sold' };
    vi.mocked(patch).mockResolvedValueOnce(soldListing as any);

    await updateListingStatus('listing-1', 'sold', 3500);

    expect(patch).toHaveBeenCalledWith(`${BASE_URL}/listing-1/status`, {
      status: 'sold',
      sold_price_cents: 3500,
    });
  });

  it('does not include sold_price_cents when it is undefined', async () => {
    vi.mocked(patch).mockResolvedValueOnce(mockListing as any);

    await updateListingStatus('listing-1', 'archived');

    expect(patch).toHaveBeenCalledWith(`${BASE_URL}/listing-1/status`, { status: 'archived' });
    const callArg = vi.mocked(patch).mock.calls[0][1] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('sold_price_cents');
  });

  it('returns the updated listing', async () => {
    const archivedListing = { ...mockListing, status: 'archived' };
    vi.mocked(patch).mockResolvedValueOnce(archivedListing as any);

    const result = await updateListingStatus('listing-1', 'archived');

    expect(result).toEqual(archivedListing);
  });

  it('propagates errors thrown by patch', async () => {
    vi.mocked(patch).mockRejectedValueOnce(new Error('Invalid status transition'));

    await expect(updateListingStatus('listing-1', 'draft')).rejects.toThrow(
      'Invalid status transition',
    );
  });
});

// ---------------------------------------------------------------------------
// getSellerListings
// ---------------------------------------------------------------------------

describe('getSellerListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get with the seller URL when no status is provided', async () => {
    vi.mocked(get).mockResolvedValueOnce([mockListing] as any);

    await getSellerListings();

    expect(get).toHaveBeenCalledWith(`${BASE_URL}/seller`);
    expect(get).toHaveBeenCalledOnce();
  });

  it('appends the status query param when status is provided', async () => {
    vi.mocked(get).mockResolvedValueOnce([mockListing] as any);

    await getSellerListings('active');

    expect(get).toHaveBeenCalledWith(`${BASE_URL}/seller?status=active`);
  });

  it('appends draft status query param', async () => {
    vi.mocked(get).mockResolvedValueOnce([] as any);

    await getSellerListings('draft');

    expect(get).toHaveBeenCalledWith(`${BASE_URL}/seller?status=draft`);
  });

  it('appends archived status query param', async () => {
    vi.mocked(get).mockResolvedValueOnce([] as any);

    await getSellerListings('archived');

    expect(get).toHaveBeenCalledWith(`${BASE_URL}/seller?status=archived`);
  });

  it('returns the array of seller listings', async () => {
    vi.mocked(get).mockResolvedValueOnce([mockListing] as any);

    const result = await getSellerListings();

    expect(result).toEqual([mockListing]);
  });

  it('propagates errors thrown by get', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(getSellerListings()).rejects.toThrow('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// getDrafts
// ---------------------------------------------------------------------------

describe('getDrafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get with the drafts URL', async () => {
    vi.mocked(get).mockResolvedValueOnce([] as any);

    await getDrafts();

    expect(get).toHaveBeenCalledWith(`${BASE_URL}/drafts`);
    expect(get).toHaveBeenCalledOnce();
  });

  it('returns the array of draft listings', async () => {
    const draftListing = { ...mockListing, status: 'draft' };
    vi.mocked(get).mockResolvedValueOnce([draftListing] as any);

    const result = await getDrafts();

    expect(result).toEqual([draftListing]);
  });
});

// ---------------------------------------------------------------------------
// createDraft
// ---------------------------------------------------------------------------

describe('createDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls post with the drafts URL and no body', async () => {
    const draftListing = { ...mockListing, status: 'draft' };
    vi.mocked(post).mockResolvedValueOnce(draftListing as any);

    await createDraft();

    expect(post).toHaveBeenCalledWith(`${BASE_URL}/drafts`);
    expect(post).toHaveBeenCalledOnce();
  });

  it('returns the created draft listing', async () => {
    const draftListing = { ...mockListing, status: 'draft' };
    vi.mocked(post).mockResolvedValueOnce(draftListing as any);

    const result = await createDraft();

    expect(result).toEqual(draftListing);
  });
});

// ---------------------------------------------------------------------------
// deleteDraft
// ---------------------------------------------------------------------------

describe('deleteDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls del with the drafts URL including the id query param', async () => {
    vi.mocked(del).mockResolvedValueOnce({ success: true } as any);

    await deleteDraft('listing-1');

    expect(del).toHaveBeenCalledWith(`${BASE_URL}/drafts?id=listing-1`);
    expect(del).toHaveBeenCalledOnce();
  });

  it('returns the success response', async () => {
    vi.mocked(del).mockResolvedValueOnce({ success: true } as any);

    const result = await deleteDraft('listing-1');

    expect(result).toEqual({ success: true });
  });

  it('propagates errors thrown by del', async () => {
    vi.mocked(del).mockRejectedValueOnce(new Error('Not a draft'));

    await expect(deleteDraft('listing-1')).rejects.toThrow('Not a draft');
  });
});

// ---------------------------------------------------------------------------
// incrementViewCount
// ---------------------------------------------------------------------------

describe('incrementViewCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls post with the view URL for the given listing ID', async () => {
    vi.mocked(post).mockResolvedValueOnce({ success: true } as any);

    await incrementViewCount('listing-1');

    expect(post).toHaveBeenCalledWith(`${BASE_URL}/listing-1/view`);
    expect(post).toHaveBeenCalledOnce();
  });

  it('returns the success response', async () => {
    vi.mocked(post).mockResolvedValueOnce({ success: true } as any);

    const result = await incrementViewCount('listing-1');

    expect(result).toEqual({ success: true });
  });

  it('propagates errors thrown by post', async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error('Server error'));

    await expect(incrementViewCount('listing-1')).rejects.toThrow('Server error');
  });
});
