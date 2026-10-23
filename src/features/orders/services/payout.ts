import { get } from '@/libs/fetch';
import type { SellerBalance, PayoutHistoryResponse } from '@/features/orders/types/payout';

export const getSellerBalance = async (): Promise<SellerBalance> =>
  get<SellerBalance>('/api/stripe/balance');

export const getPayoutHistory = async (params?: {
  limit?: number;
  startingAfter?: string;
}): Promise<PayoutHistoryResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.startingAfter) searchParams.set('starting_after', params.startingAfter);
  const query = searchParams.toString();
  return get<PayoutHistoryResponse>(`/api/stripe/payouts${query ? `?${query}` : ''}`);
};
