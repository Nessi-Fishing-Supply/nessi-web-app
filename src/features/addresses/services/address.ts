import { get, post, put, del, patch } from '@/libs/fetch';
import type { Address, AddressFormData } from '@/features/addresses/types/address';

const BASE_URL = '/api/addresses';

export const getAddresses = async (): Promise<Address[]> => get<Address[]>(BASE_URL);

export const createAddress = async (data: AddressFormData): Promise<Address> =>
  post<Address>(BASE_URL, data);

export const updateAddress = async (
  addressId: string,
  data: Partial<AddressFormData>,
): Promise<Address> => put<Address>(`${BASE_URL}/${addressId}`, data);

export const deleteAddress = async (addressId: string): Promise<{ success: boolean }> =>
  del<{ success: boolean }>(`${BASE_URL}/${addressId}`);

export const setDefaultAddress = async (addressId: string): Promise<Address> =>
  patch<Address>(`${BASE_URL}/${addressId}/default`);
