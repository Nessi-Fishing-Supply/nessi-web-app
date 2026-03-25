import { NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { MAX_MEMBERS_PER_SHOP } from '@/features/shops/constants/limits';
import { checkMemberShopLimit } from '@/features/shops/utils/check-member-shop-limit';

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
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

  try {
    const { data: invite, error: inviteError } = await admin
      .from('shop_invites')
      .select('*, shops(shop_name)')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (invite.status !== 'pending') {
      const codeMap: Record<string, string> = {
        revoked: 'INVITE_REVOKED',
        accepted: 'INVITE_ALREADY_ACCEPTED',
      };
      const code = codeMap[invite.status] ?? 'INVITE_INVALID';
      const messageMap: Record<string, string> = {
        revoked: 'This invitation has been revoked',
        accepted: 'This invitation has already been accepted',
      };
      const error = messageMap[invite.status] ?? 'This invitation is no longer valid';
      return NextResponse.json({ error, code }, { status: 400, headers: AUTH_CACHE_HEADERS });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired', code: 'INVITE_EXPIRED' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { data: existingMember } = await admin
      .from('shop_members')
      .select('id')
      .eq('shop_id', invite.shop_id)
      .eq('member_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this shop', code: 'ALREADY_MEMBER' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    const [
      { count: memberCount, error: memberCountError },
      { count: inviteCount, error: inviteCountError },
    ] = await Promise.all([
      admin
        .from('shop_members')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', invite.shop_id),
      admin
        .from('shop_invites')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', invite.shop_id)
        .eq('status', 'pending')
        .neq('token', token),
    ]);

    if (memberCountError) {
      return NextResponse.json(
        { error: memberCountError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }
    if (inviteCountError) {
      return NextResponse.json(
        { error: inviteCountError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const totalCount = (memberCount ?? 0) + (inviteCount ?? 0);
    if (totalCount >= MAX_MEMBERS_PER_SHOP) {
      return NextResponse.json(
        { error: 'Shop has reached the maximum number of members', code: 'MEMBER_LIMIT_REACHED' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    const shopLimit = await checkMemberShopLimit(user.id);
    if (!shopLimit.withinLimit) {
      return NextResponse.json(
        {
          error: 'You have reached the maximum number of shops you can belong to',
          code: 'SHOP_LIMIT_REACHED',
        },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { error: insertError } = await admin.from('shop_members').insert({
      shop_id: invite.shop_id,
      member_id: user.id,
      role_id: invite.role_id,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { error: updateError } = await admin
      .from('shop_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const shops = invite.shops as { shop_name: string } | null;

    return NextResponse.json(
      { success: true, shopId: invite.shop_id, shopName: shops?.shop_name ?? '' },
      { headers: AUTH_CACHE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
