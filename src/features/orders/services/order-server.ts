import { createClient } from '@/libs/supabase/server';
import type { createAdminClient } from '@/libs/supabase/admin';
import type { OrderWithListing } from '@/features/orders/types/order';

const ORDER_WITH_LISTING_SELECT = `
  *,
  listing:listings(title, cover_photo_url),
  buyer:members!orders_buyer_id_fkey(first_name, last_name, avatar_url),
  seller:members!orders_seller_id_fkey(first_name, last_name, avatar_url, stripe_account_id)
`;

export async function getOrdersByBuyerServer(): Promise<OrderWithListing[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_WITH_LISTING_SELECT)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as unknown as OrderWithListing[];
}

export async function getOrdersBySellerServer(status?: string): Promise<OrderWithListing[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase.from('orders').select(ORDER_WITH_LISTING_SELECT).eq('seller_id', user.id);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as unknown as OrderWithListing[];
}

export async function getOrderByIdServer(orderId: string): Promise<OrderWithListing | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_WITH_LISTING_SELECT)
    .eq('id', orderId)
    .single();

  if (error || !data) return null;

  const order = data as unknown as OrderWithListing;
  if (order.buyer_id !== user.id && order.seller_id !== user.id) return null;

  return order;
}

export async function updateOrderStatusServer(
  orderId: string,
  updates: Record<string, unknown>,
): Promise<OrderWithListing | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select(ORDER_WITH_LISTING_SELECT)
    .single();

  if (error || !data) return null;
  return data as unknown as OrderWithListing;
}

export async function getOrdersForAutoReleaseServer(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<OrderWithListing[]> {
  const { data, error } = await adminClient
    .from('orders')
    .select(ORDER_WITH_LISTING_SELECT)
    .eq('status', 'verification')
    .lt('verification_deadline', new Date().toISOString())
    .is('buyer_accepted_at', null);

  if (error || !data) return [];
  return data as unknown as OrderWithListing[];
}

export async function getOrdersForAutoDeliverServer(
  adminClient: ReturnType<typeof createAdminClient>,
): Promise<OrderWithListing[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await adminClient
    .from('orders')
    .select(ORDER_WITH_LISTING_SELECT)
    .eq('status', 'shipped')
    .lt('shipped_at', thirtyDaysAgo.toISOString());

  if (error || !data) return [];
  return data as unknown as OrderWithListing[];
}
