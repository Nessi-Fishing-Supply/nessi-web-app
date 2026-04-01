import { NextResponse } from 'next/server';
import { expirePendingOffersServer } from '@/features/messaging/services/offers-server';

// Expire stale pending and accepted offers past their time windows
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { expired_pending, expired_checkout } = await expirePendingOffersServer();
    return NextResponse.json({ expired_pending, expired_checkout });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
