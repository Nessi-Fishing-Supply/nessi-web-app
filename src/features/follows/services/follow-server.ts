import { createClient } from '@/libs/supabase/server';
import type {
  Follow,
  FollowTargetType,
  FollowStatus,
  FollowerCount,
  FollowingItem,
} from '@/features/follows/types/follow';

export async function createFollowServer(
  followerId: string,
  targetType: FollowTargetType,
  targetId: string,
): Promise<Follow> {
  if (targetType === 'member' && followerId === targetId) {
    throw new Error('Cannot follow yourself');
  }

  const supabase = await createClient();

  const { data: follow, error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, target_type: targetType, target_id: targetId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Already following');
    }
    throw new Error(`Failed to create follow: ${error.message}`);
  }

  return follow as Follow;
}

export async function deleteFollowServer(
  followerId: string,
  targetType: FollowTargetType,
  targetId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .select();

  if (error) {
    throw new Error(`Failed to delete follow: ${error.message}`);
  }

  return { success: Array.isArray(data) && data.length > 0 };
}

export async function getFollowStatusServer(
  followerId: string,
  targetType: FollowTargetType,
  targetId: string,
): Promise<FollowStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get follow status: ${error.message}`);
  }

  return { is_following: !!data };
}

export async function getFollowerCountServer(
  targetType: FollowTargetType,
  targetId: string,
): Promise<FollowerCount> {
  const supabase = await createClient();

  const table = targetType === 'member' ? 'members' : 'shops';

  const { data, error } = await supabase
    .from(table)
    .select('follower_count')
    .eq('id', targetId)
    .single();

  if (error) {
    throw new Error(`Failed to get follower count: ${error.message}`);
  }

  return { count: (data as { follower_count: number } | null)?.follower_count ?? 0 };
}

export async function getFollowingServer(
  followerId: string,
  targetType?: FollowTargetType,
): Promise<FollowingItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('follows')
    .select('id, target_type, target_id, created_at')
    .eq('follower_id', followerId)
    .order('created_at', { ascending: false });

  if (targetType) {
    query = query.eq('target_type', targetType);
  }

  const { data: follows, error } = await query;

  if (error) {
    throw new Error(`Failed to get following: ${error.message}`);
  }

  if (!follows || follows.length === 0) {
    return [];
  }

  const memberFollows = follows.filter((f) => f.target_type === 'member');
  const shopFollows = follows.filter((f) => f.target_type === 'shop');

  const memberIds = memberFollows.map((f) => f.target_id);
  const shopIds = shopFollows.map((f) => f.target_id);

  const memberMap = new Map<string, { name: string; avatar_url: string | null }>();
  const shopMap = new Map<string, { name: string; avatar_url: string | null }>();

  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, first_name, last_name, avatar_url')
      .in('id', memberIds);

    if (membersError) {
      throw new Error(`Failed to get member details: ${membersError.message}`);
    }

    for (const member of members ?? []) {
      memberMap.set(member.id, {
        name: `${member.first_name} ${member.last_name}`,
        avatar_url: member.avatar_url,
      });
    }
  }

  if (shopIds.length > 0) {
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, shop_name, avatar_url')
      .in('id', shopIds);

    if (shopsError) {
      throw new Error(`Failed to get shop details: ${shopsError.message}`);
    }

    for (const shop of shops ?? []) {
      shopMap.set(shop.id, {
        name: shop.shop_name,
        avatar_url: shop.avatar_url,
      });
    }
  }

  return follows.map((follow) => {
    const targetMap = follow.target_type === 'member' ? memberMap : shopMap;
    const target = targetMap.get(follow.target_id);

    return {
      id: follow.id,
      target_type: follow.target_type as FollowTargetType,
      target_id: follow.target_id,
      created_at: follow.created_at,
      name: target?.name ?? '',
      avatar_url: target?.avatar_url ?? null,
    };
  });
}
