import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';

// Returns the pending ownership transfer request for a shop, if one exists.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'view', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const admin = createAdminClient();

  const { data: transfer, error } = await admin
    .from('shop_ownership_transfers')
    .select('*')
    .eq('shop_id', shopId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (!transfer) {
    return NextResponse.json(
      { error: 'No pending ownership transfer found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json(transfer, { headers: AUTH_CACHE_HEADERS });
}

// Cancels a pending shop ownership transfer before it is accepted.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const admin = createAdminClient();

  const { data: transfer } = await admin
    .from('shop_ownership_transfers')
    .select('id')
    .eq('shop_id', shopId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!transfer) {
    return NextResponse.json(
      { error: 'No pending ownership transfer found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  const { error: updateError } = await admin
    .from('shop_ownership_transfers')
    .update({ status: 'cancelled' })
    .eq('id', transfer.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
}
