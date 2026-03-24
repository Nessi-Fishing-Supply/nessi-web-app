import { del, post } from '@/libs/fetch';
import { createClient } from '@/libs/supabase/client';
import type { Shop, ShopMember, ShopUpdate } from '@/features/shops/types/shop';

export async function getShop(id: string): Promise<Shop | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('shops').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch shop: ${error.message}`);
  }

  return data;
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch shop by slug: ${error.message}`);
  }

  return data;
}

export async function getShopsByOwner(memberId: string): Promise<Shop[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', memberId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch shops by owner: ${error.message}`);
  }

  return data;
}

export async function getShopsByMember(memberId: string): Promise<Shop[]> {
  const supabase = createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from('shop_members')
    .select('shop_id')
    .eq('member_id', memberId);

  if (membershipError) {
    throw new Error(`Failed to fetch shop memberships: ${membershipError.message}`);
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const shopIds = memberships.map((m) => m.shop_id);

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .in('id', shopIds)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch shops by member: ${error.message}`);
  }

  return data;
}

export async function createShop(data: {
  shopName: string;
  slug: string;
  description?: string | null;
  ownerId: string;
}): Promise<Shop> {
  const response = await fetch('/api/shops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to create shop');
  }

  const body = await response.json();
  return body.shop;
}

export async function updateShop(id: string, data: ShopUpdate): Promise<Shop> {
  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from('shops')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shop: ${error.message}`);
  }

  return updated;
}

export async function deleteShop(id: string): Promise<void> {
  await del(`/api/shops/${id}`);
}

export async function updateShopSlug(shopId: string, slug: string): Promise<void> {
  await post('/api/shops/slug', { shopId, slug });
}

export async function getShopMembers(shopId: string): Promise<ShopMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shop_members')
    .select('*, members(first_name, last_name, avatar_url)')
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(`Failed to fetch shop members: ${error.message}`);
  }

  return data as unknown as ShopMember[];
}

export async function addShopMember(
  shopId: string,
  memberId: string,
  roleId: string,
): Promise<ShopMember> {
  const response = await fetch(`/api/shops/${shopId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, roleId }),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to add shop member');
  }

  return response.json();
}

export async function removeShopMember(shopId: string, memberId: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/members/${memberId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to remove shop member');
  }
}

export async function transferOwnership(shopId: string, newOwnerId: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newOwnerId }),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to transfer ownership');
  }
}

export async function checkShopSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.from('slugs').select('slug').eq('slug', slug).limit(1);

  if (error) {
    throw new Error(`Failed to check shop slug availability: ${error.message}`);
  }

  return data.length === 0;
}
