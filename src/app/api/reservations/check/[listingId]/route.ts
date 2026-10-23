import { NextResponse } from 'next/server';
import { isListingReservedServer } from '@/features/reservations/services/reservation-server';

// Check if a listing is currently reserved by another buyer
export async function GET(req: Request, context: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await context.params;
  try {
    const result = await isListingReservedServer(listingId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking reservation status:', error);
    return NextResponse.json({ error: 'Failed to check reservation status' }, { status: 500 });
  }
}
