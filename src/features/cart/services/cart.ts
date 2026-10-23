import { get, post, del, patch } from '@/libs/fetch';
import type {
  CartItem,
  CartItemWithListing,
  CartValidationResult,
  GuestCartItem,
} from '@/features/cart/types/cart';

const BASE_URL = '/api/cart';

export const getCart = async (): Promise<CartItemWithListing[]> =>
  get<CartItemWithListing[]>(BASE_URL);

export const getCartCount = async (): Promise<{ count: number }> =>
  get<{ count: number }>(`${BASE_URL}/count`);

export const addToCart = async (listingId: string, addedFrom?: string): Promise<CartItem> =>
  post<CartItem>(BASE_URL, { listingId, addedFrom });

export const removeFromCart = async (cartItemId: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`${BASE_URL}/${cartItemId}`);

export const clearCart = async (): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(BASE_URL);

export const validateCart = async (): Promise<CartValidationResult> =>
  post<CartValidationResult>(`${BASE_URL}/validate`);

export const refreshExpiry = async (cartItemId: string): Promise<CartItem> =>
  patch<CartItem>(`${BASE_URL}/${cartItemId}/expiry`);

export const mergeGuestCart = async (items: GuestCartItem[]): Promise<{ merged: number }> =>
  post<{ merged: number }>(`${BASE_URL}/merge`, { items });
