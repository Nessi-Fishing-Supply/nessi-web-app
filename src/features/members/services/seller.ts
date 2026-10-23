import { get, post } from '@/libs/fetch';
import type { SellerPreconditions } from '@/features/members/types/seller';
import type { Member } from '@/features/members/types/member';

export async function getSellerPreconditions(): Promise<SellerPreconditions> {
  return get<SellerPreconditions>('/api/members/seller-preconditions');
}

export async function toggleSeller(isSeller: boolean): Promise<Member> {
  return post<Member>('/api/members/toggle-seller', { is_seller: isSeller });
}
