import { get, post } from '@/libs/fetch';
import type { OrderWithListing } from '@/features/orders/types/order';

export const getOrders = async (): Promise<OrderWithListing[]> =>
  get<OrderWithListing[]>('/api/orders');

export const getOrder = async (id: string): Promise<OrderWithListing> =>
  get<OrderWithListing>(`/api/orders/${id}`);

export const getSellerOrders = async (status?: string): Promise<OrderWithListing[]> =>
  get<OrderWithListing[]>(`/api/orders/seller${status ? `?status=${status}` : ''}`);

export const shipOrder = async (
  id: string,
  data: { trackingNumber: string; carrier: string },
): Promise<OrderWithListing> => post<OrderWithListing>(`/api/orders/${id}/ship`, data);

export const acceptOrder = async (id: string): Promise<OrderWithListing> =>
  post<OrderWithListing>(`/api/orders/${id}/accept`);
