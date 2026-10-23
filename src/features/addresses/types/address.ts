import type { Database } from '@/types/database';

export const MAX_ADDRESSES = 5;

export type Address = Database['public']['Tables']['addresses']['Row'];

export type AddressInsert = Omit<
  Database['public']['Tables']['addresses']['Insert'],
  'id' | 'created_at' | 'updated_at' | 'user_id'
>;

export type AddressUpdate = Partial<AddressInsert>;

export type AddressFormData = {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  is_default: boolean;
};
