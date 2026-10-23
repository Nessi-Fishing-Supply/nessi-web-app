import type { Database } from '@/types/database';

export type Offer = Database['public']['Tables']['offers']['Row'];

export type OfferInsert = Omit<
  Database['public']['Tables']['offers']['Insert'],
  'id' | 'created_at' | 'updated_at'
>;

export type OfferStatus = Database['public']['Enums']['offer_status'];

export type OfferWithDetails = Offer & {
  listing: { id: string; title: string; price_cents: number; status: string } | null;
  buyer: { id: string; first_name: string; last_name: string; avatar_url: string | null };
  seller: { id: string; first_name: string; last_name: string; avatar_url: string | null };
};

export type CreateOfferParams = {
  listingId: string;
  sellerId: string;
  amountCents: number;
};

export type CounterOfferParams = {
  amountCents: number;
};
