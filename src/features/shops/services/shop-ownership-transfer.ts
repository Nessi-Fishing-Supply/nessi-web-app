import { del, get, post } from '@/libs/fetch';
import { FetchError } from '@/libs/fetch-error';
import type { OwnershipTransfer, OwnershipTransferWithDetails } from '@/features/shops/types/shop';

export async function initiateOwnershipTransfer(
  shopId: string,
  newOwnerId: string,
): Promise<{ success: true }> {
  return post(`/api/shops/${shopId}/ownership`, { newOwnerId });
}

export async function getOwnershipTransfer(shopId: string): Promise<OwnershipTransfer | null> {
  try {
    return await get<OwnershipTransfer>(`/api/shops/${shopId}/ownership-transfer`);
  } catch (error) {
    if (error instanceof FetchError && error.status === 404) return null;
    throw error;
  }
}

export async function cancelOwnershipTransfer(shopId: string): Promise<{ success: true }> {
  return del(`/api/shops/${shopId}/ownership-transfer`);
}

export async function getOwnershipTransferByToken(
  token: string,
): Promise<OwnershipTransferWithDetails> {
  const res = await fetch(`/api/shops/ownership-transfer/${token}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || 'Failed to fetch transfer details'), {
      code: data.code,
      status: res.status,
    });
  }
  return res.json();
}

export async function acceptOwnershipTransfer(
  token: string,
): Promise<{ success: true; shopId: string; shopName: string }> {
  const res = await fetch(`/api/shops/ownership-transfer/${token}/accept`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || 'Failed to accept ownership transfer'), {
      code: data.code,
      status: res.status,
    });
  }
  return res.json();
}
