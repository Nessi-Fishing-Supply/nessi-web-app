import { get, del } from '@/libs/fetch';
import type { BlockedMemberItem } from '@/features/blocks/types/block';

export const getBlockedMembers = async (): Promise<BlockedMemberItem[]> =>
  get<BlockedMemberItem[]>('/api/blocks');

export const unblockMember = async (blockedId: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`/api/blocks?blocked_id=${blockedId}`);
