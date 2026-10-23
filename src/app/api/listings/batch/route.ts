import { getListingsByIdsServer } from '@/features/listings/services/listing-server';
import { NextResponse } from 'next/server';

const MAX_IDS = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fetches multiple listings by ID in a single request, useful for cart and watchlist displays.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam || idsParam.trim() === '') {
      return NextResponse.json({ error: 'ids param is required' }, { status: 400 });
    }

    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id));

    const rawCount = idsParam.split(',').filter((id) => id.trim() !== '').length;

    if (rawCount > MAX_IDS) {
      return NextResponse.json(
        { error: `ids param exceeds maximum of ${MAX_IDS}` },
        { status: 400 },
      );
    }

    const listings = await getListingsByIdsServer(ids);

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching listings by ids:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}
