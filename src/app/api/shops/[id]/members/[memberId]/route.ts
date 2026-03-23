import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id: shopId, memberId } = await params;

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

  const { data: shop } = await admin.from('shops').select('owner_id').eq('id', shopId).single();

  const isOwner = shop?.owner_id === user.id;
  const isRemovingSelf = memberId === user.id;

  if (!isOwner && !isRemovingSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const { error } = await admin
    .from('shop_members')
    .delete()
    .eq('shop_id', shopId)
    .eq('member_id', memberId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
}
