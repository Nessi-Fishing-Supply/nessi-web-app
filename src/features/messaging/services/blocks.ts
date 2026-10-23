import { post, del } from '@/libs/fetch';
import type { MemberBlock } from '@/features/messaging/types/block';

export const blockMember = async (memberId: string): Promise<MemberBlock> =>
  post<MemberBlock>('/api/members/block', { memberId });

export const unblockMember = async (memberId: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`/api/members/block/${memberId}`);
