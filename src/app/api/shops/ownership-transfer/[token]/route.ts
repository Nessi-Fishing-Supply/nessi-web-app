import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';

// Looks up the details of a shop ownership transfer by its invite token.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: AUTH_CACHE_HEADERS },
    );
  }

  const admin = createAdminClient();

  const { data: transfer, error } = await admin
    .from('shop_ownership_transfers')
    .select('*, shops(shop_name)')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (!transfer || transfer.status !== 'pending') {
    return NextResponse.json(
      { error: 'Transfer not found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (new Date(transfer.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This transfer request has expired', code: 'TRANSFER_EXPIRED' },
      { status: 410, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (user.id !== transfer.to_member_id) {
    return NextResponse.json(
      { error: 'You are not the intended recipient of this transfer', code: 'WRONG_USER' },
      { status: 403, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Fetch member names for the details view
  const [fromMemberResult, toMemberResult] = await Promise.all([
    admin
      .from('members')
      .select('first_name, last_name')
      .eq('id', transfer.from_member_id)
      .single(),
    admin.from('members').select('first_name, last_name').eq('id', transfer.to_member_id).single(),
  ]);

  const shops = transfer.shops as { shop_name: string } | null;

  return NextResponse.json(
    {
      id: transfer.id,
      shopId: transfer.shop_id,
      shopName: shops?.shop_name ?? '',
      fromMemberId: transfer.from_member_id,
      fromMemberName: fromMemberResult.data
        ? `${fromMemberResult.data.first_name} ${fromMemberResult.data.last_name}`.trim()
        : 'Unknown',
      toMemberId: transfer.to_member_id,
      toMemberName: toMemberResult.data
        ? `${toMemberResult.data.first_name} ${toMemberResult.data.last_name}`.trim()
        : 'Unknown',
      status: transfer.status,
      token: transfer.token,
      expiresAt: transfer.expires_at,
      createdAt: transfer.created_at,
    },
    { headers: AUTH_CACHE_HEADERS },
  );
}
