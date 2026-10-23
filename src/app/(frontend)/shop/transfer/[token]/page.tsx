import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/libs/supabase/admin';
import { createClient } from '@/libs/supabase/server';
import TransferAccept from '@/features/shops/components/transfer-accept';
import type { TransferAcceptData } from '@/features/shops/types/shop';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('shop_ownership_transfers')
    .select('shops(shop_name)')
    .eq('token', token)
    .single();
  const shopName = (data?.shops as { shop_name: string } | null)?.shop_name;
  return { title: shopName ? `Transfer Ownership — ${shopName}` : 'Ownership Transfer' };
}

export default async function TransferPage({ params }: Props) {
  const { token } = await params;
  const adminClient = createAdminClient();
  const serverClient = await createClient();

  // Fetch transfer with shop name — admin client bypasses RLS
  const { data: transfer } = await adminClient
    .from('shop_ownership_transfers')
    .select('*, shops(shop_name)')
    .eq('token', token)
    .single();

  if (!transfer || transfer.status !== 'pending') notFound();

  // Fetch from_member name separately to avoid FK disambiguation complexity
  const { data: fromMember } = await adminClient
    .from('members')
    .select('first_name, last_name')
    .eq('id', transfer.from_member_id)
    .single();

  // Verify the current user is the intended recipient
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user || user.id !== transfer.to_member_id) notFound();

  // Compute effective status — expired transfers still show the expired message
  const now = new Date();
  const effectiveStatus: TransferAcceptData['status'] =
    new Date(transfer.expires_at) < now ? 'expired' : 'pending';

  const shop = transfer.shops as { shop_name: string } | null;

  const fromMemberName = fromMember?.first_name
    ? `${fromMember.first_name} ${fromMember.last_name ?? ''}`.trim()
    : 'A shop member';

  const transferData: TransferAcceptData = {
    token: transfer.token,
    shopName: shop?.shop_name ?? 'Unknown Shop',
    fromMemberName,
    expiresAt: transfer.expires_at,
    status: effectiveStatus,
  };

  return <TransferAccept transfer={transferData} />;
}
