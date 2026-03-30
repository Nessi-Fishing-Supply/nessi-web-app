import { createClient } from '@/libs/supabase/server';
import type { BlockedMemberItem } from '@/features/blocks/types/block';

export async function getBlockedMembersServer(blockerId: string): Promise<BlockedMemberItem[]> {
  const supabase = await createClient();

  const { data: blocks, error } = await supabase
    .from('member_blocks')
    .select('id, blocked_id, created_at')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get blocked members: ${error.message}`);
  }

  if (!blocks || blocks.length === 0) {
    return [];
  }

  const blockedIds = blocks.map((b) => b.blocked_id);

  const memberMap = new Map<
    string,
    { name: string; avatar_url: string | null; slug: string | null }
  >();

  if (blockedIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, first_name, last_name, avatar_url, slug')
      .in('id', blockedIds);

    if (membersError) {
      throw new Error(`Failed to get member details: ${membersError.message}`);
    }

    for (const member of members ?? []) {
      memberMap.set(member.id, {
        name: `${member.first_name} ${member.last_name}`,
        avatar_url: member.avatar_url,
        slug: member.slug,
      });
    }
  }

  return blocks.map((block) => {
    const member = memberMap.get(block.blocked_id);

    return {
      id: block.id,
      blocked_id: block.blocked_id,
      created_at: block.created_at,
      name: member?.name ?? '',
      avatar_url: member?.avatar_url ?? null,
      slug: member?.slug ?? null,
    };
  });
}

export async function unblockMemberServer(
  blockerId: string,
  blockedId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .select();

  if (error) {
    throw new Error(`Failed to unblock member: ${error.message}`);
  }

  return { success: Array.isArray(data) && data.length > 0 };
}
