import { createClient } from '@/libs/supabase/server';
import { MAX_ADDRESSES } from '@/features/addresses/types/address';
import type { Address, AddressFormData } from '@/features/addresses/types/address';

export async function getAddressesServer(userId: string): Promise<Address[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch addresses: ${error.message}`);
  }

  return (data ?? []) as Address[];
}

export async function getAddressServer(userId: string, addressId: string): Promise<Address> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', addressId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Address not found');
  }

  return data as Address;
}

export async function createAddressServer(
  userId: string,
  formData: AddressFormData,
): Promise<Address> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from('addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    throw new Error(`Failed to check address count: ${countError.message}`);
  }

  if ((count ?? 0) >= MAX_ADDRESSES) {
    throw new Error(`Maximum of ${MAX_ADDRESSES} addresses allowed`);
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({ ...formData, user_id: userId })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create address: ${error?.message}`);
  }

  return data as Address;
}

export async function updateAddressServer(
  userId: string,
  addressId: string,
  formData: Partial<AddressFormData>,
): Promise<Address> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('addresses')
    .update(formData)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update address: ${error?.message ?? 'Address not found'}`);
  }

  return data as Address;
}

export async function deleteAddressServer(userId: string, addressId: string): Promise<void> {
  const supabase = await createClient();

  const { data: deleted, error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId)
    .select('id, is_default')
    .single();

  if (error || !deleted) {
    throw new Error('Address not found');
  }

  if (deleted.is_default) {
    const { data: next } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', next.id)
        .eq('user_id', userId);
    }
  }
}

export async function getDefaultAddressServer(userId: string): Promise<Address | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch default address: ${error.message}`);
  }

  return (data as Address) ?? null;
}
