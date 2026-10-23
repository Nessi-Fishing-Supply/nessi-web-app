import { NextResponse } from 'next/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { requireShopPermission } from '@/libs/shop-permissions';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { validateInviteInput } from '@/features/shops/validations/invite';
import { MAX_MEMBERS_PER_SHOP } from '@/features/shops/constants/limits';
import { sendEmail } from '@/features/email/services/send-email';
import { inviteToShop } from '@/features/email/templates/invite-to-shop';

// Sends a shop invite email to a new member with a specified role.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  let body: { email?: string; roleId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  const { email, roleId } = body;

  const validationError = validateInviteInput({
    email: email ?? '',
    roleId: roleId ?? '',
  });
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400, headers: AUTH_CACHE_HEADERS },
    );
  }

  const normalizedEmail = email!.toLowerCase();

  const admin = createAdminClient();

  try {
    // 5-member cap check: count existing members + pending invites
    const [
      { count: memberCount, error: memberCountError },
      { count: inviteCount, error: inviteCountError },
    ] = await Promise.all([
      admin.from('shop_members').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
      admin
        .from('shop_invites')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .eq('status', 'pending'),
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

    // Already a member check: find auth user by email, then check shop_members
    let page = 1;
    let matchingUserId: string | null = null;
    while (true) {
      const {
        data: { users },
        error: listError,
      } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listError || users.length === 0) break;
      const found = users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (found) {
        matchingUserId = found.id;
        break;
      }
      if (users.length < 1000) break;
      page++;
    }

    if (matchingUserId) {
      const { data: existingMember } = await admin
        .from('shop_members')
        .select('id')
        .eq('shop_id', shopId)
        .eq('member_id', matchingUserId)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this shop' },
          { status: 409, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    // Duplicate pending invite check
    const { data: existingInvite } = await admin
      .from('shop_invites')
      .select('id')
      .eq('shop_id', shopId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: 'A pending invite already exists for this email' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Get inviter name
    const { data: inviter, error: inviterError } = await admin
      .from('members')
      .select('first_name, last_name')
      .eq('id', result.user.id)
      .single();

    if (inviterError) {
      return NextResponse.json(
        { error: inviterError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Generate token and insert invite
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertError } = await admin
      .from('shop_invites')
      .insert({
        shop_id: shopId,
        email: normalizedEmail,
        role_id: roleId!,
        invited_by: result.user.id,
        token,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Get role name and shop name for email
    const [{ data: role }, { data: shop }] = await Promise.all([
      admin.from('shop_roles').select('name').eq('id', roleId!).single(),
      admin.from('shops').select('shop_name').eq('id', shopId).single(),
    ]);

    // Send invite email (failure should not block the response)
    if (role && shop) {
      const inviterName =
        `${inviter.first_name ?? ''} ${inviter.last_name ?? ''}`.trim() || 'A shop member';
      const template = inviteToShop({
        shopName: shop.shop_name,
        inviterName,
        roleName: role.name,
        token,
      });
      try {
        await sendEmail({ to: normalizedEmail, ...template });
      } catch (emailError) {
        console.error('[api/shops/invites] Failed to send invite email', {
          error: String(emailError),
          inviteId: invite.id,
        });
      }
    }

    return NextResponse.json(invite, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Returns all pending and past invites for a shop.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'view', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const admin = createAdminClient();

  try {
    const { data: invites, error } = await admin
      .from('shop_invites')
      .select('*, members!shop_invites_invited_by_fkey(first_name, last_name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(invites, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
