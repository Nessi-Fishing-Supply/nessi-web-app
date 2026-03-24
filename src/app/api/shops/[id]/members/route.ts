import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

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

  const body = await request.json();
  const { memberId, roleId } = body as { memberId: string; roleId: string };

  const admin = createAdminClient();

  const { data: shop } = await admin.from('shops').select('owner_id').eq('id', shopId).single();

  if (!shop || shop.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  const { data, error } = await admin
    .from('shop_members')
    .insert({ shop_id: shopId, member_id: memberId, role_id: roleId })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  return NextResponse.json(data, { headers: AUTH_CACHE_HEADERS });
}
