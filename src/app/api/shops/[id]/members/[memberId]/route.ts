import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';

// Removes a member from a shop, or allows a member to remove themselves.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id: shopId, memberId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });

  if (result instanceof NextResponse) {
    // Permission check failed — allow self-removal as a fallback
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || memberId !== user.id) {
      return result;
    }

    // Self-removal: authenticated user removing themselves
  }

  const admin = createAdminClient();

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
