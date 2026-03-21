import { createClient } from '@/libs/supabase/client';
import type {
  Shop,
  ShopInsert,
  ShopMember,
  ShopMemberRole,
  ShopUpdate,
} from '@/features/shops/types/shop';

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

export async function createShop(data: ShopInsert): Promise<Shop> {
  const supabase = createClient();
  const { data: created, error } = await supabase.from('shops').insert(data).select().single();

  if (error) {
    throw new Error(`Failed to create shop: ${error.message}`);
  }

  return created;
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

export async function deleteShop(id: string): Promise<Shop> {
  const supabase = createClient();
  const { data: deleted, error } = await supabase
    .from('shops')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete shop: ${error.message}`);
  }

  return deleted;
}

export async function getShopMembers(shopId: string): Promise<ShopMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('shop_members').select('*').eq('shop_id', shopId);

  if (error) {
    throw new Error(`Failed to fetch shop members: ${error.message}`);
  }

  return data;
}

export async function addShopMember(
  shopId: string,
  memberId: string,
  role: ShopMemberRole,
): Promise<ShopMember> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shop_members')
    .insert({ shop_id: shopId, member_id: memberId, role })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add shop member: ${error.message}`);
  }

  return data;
}

export async function removeShopMember(shopId: string, memberId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('shop_members')
    .delete()
    .eq('shop_id', shopId)
    .eq('member_id', memberId);

  if (error) {
    throw new Error(`Failed to remove shop member: ${error.message}`);
  }
}

export async function transferOwnership(shopId: string, newOwnerId: string): Promise<void> {
  const supabase = createClient();

  const { data: currentShop, error: shopFetchError } = await supabase
    .from('shops')
    .select('owner_id')
    .eq('id', shopId)
    .single();

  if (shopFetchError) {
    throw new Error(`Failed to fetch current shop owner: ${shopFetchError.message}`);
  }

  const currentOwnerId = currentShop.owner_id;

  const { error: updateShopError } = await supabase
    .from('shops')
    .update({ owner_id: newOwnerId })
    .eq('id', shopId);

  if (updateShopError) {
    throw new Error(`Failed to transfer shop ownership: ${updateShopError.message}`);
  }

  const { error: updateNewOwnerRoleError } = await supabase
    .from('shop_members')
    .update({ role: 'owner' })
    .eq('shop_id', shopId)
    .eq('member_id', newOwnerId);

  if (updateNewOwnerRoleError) {
    throw new Error(`Failed to update new owner role: ${updateNewOwnerRoleError.message}`);
  }

  if (currentOwnerId) {
    const { error: updateOldOwnerRoleError } = await supabase
      .from('shop_members')
      .update({ role: 'manager' })
      .eq('shop_id', shopId)
      .eq('member_id', currentOwnerId);

    if (updateOldOwnerRoleError) {
      throw new Error(`Failed to update old owner role: ${updateOldOwnerRoleError.message}`);
    }
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
