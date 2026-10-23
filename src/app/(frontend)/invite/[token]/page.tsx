import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/libs/supabase/admin';
import { createClient } from '@/libs/supabase/server';
import { InviteAccept } from '@/features/shops/components/invite-accept';
import type { InvitePageData } from '@/features/shops/types/invite';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('shop_invites')
    .select('shops(shop_name)')
    .eq('token', token)
    .single();
  const shopName = (data?.shops as { shop_name: string } | null)?.shop_name;
  return { title: shopName ? `Join ${shopName}` : 'Shop Invitation' };
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const adminClient = createAdminClient();
  const serverClient = await createClient();

  // Fetch invite with related data — admin client bypasses RLS (invitee not yet a member)
  const { data: invite } = await adminClient
    .from('shop_invites')
    .select(
      `
      token,
      status,
      expires_at,
      shops ( shop_name, avatar_url ),
      shop_roles ( name ),
      members!shop_invites_invited_by_fkey ( first_name, last_name )
    `,
    )
    .eq('token', token)
    .single();

  if (!invite) notFound();

  // Compute effective status (DB may still say 'pending' for expired invites)
  const now = new Date();
  const effectiveStatus =
    invite.status === 'pending' && new Date(invite.expires_at) < now
      ? 'expired'
      : (invite.status as InvitePageData['status']);

  const shop = invite.shops as { shop_name: string; avatar_url: string | null } | null;
  const role = invite.shop_roles as { name: string } | null;
  const inviter = invite.members as {
    first_name: string | null;
    last_name: string | null;
  } | null;

  const inviteData: InvitePageData = {
    token: invite.token,
    shopName: shop?.shop_name ?? 'Unknown Shop',
    shopAvatarUrl: shop?.avatar_url ?? null,
    inviterName: inviter?.first_name
      ? `${inviter.first_name} ${inviter.last_name ?? ''}`.trim()
      : 'A shop member',
    roleName: role?.name ?? 'Member',
    expiresAt: invite.expires_at,
    status: effectiveStatus,
  };

  const {
    data: { user },
  } = await serverClient.auth.getUser();

  return <InviteAccept invite={inviteData} isAuthenticated={!!user} />;
}
