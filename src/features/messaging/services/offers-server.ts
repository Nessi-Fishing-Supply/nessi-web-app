import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import {
  createThreadServer,
  createMessageServer,
} from '@/features/messaging/services/messaging-server';
import {
  validateOfferAmount,
  OFFER_EXPIRY_HOURS,
  OFFER_CHECKOUT_WINDOW_HOURS,
} from '@/features/messaging/utils/offer-validation';
import type {
  Offer,
  OfferWithDetails,
  CreateOfferParams,
  CounterOfferParams,
} from '@/features/messaging/types/offer';

export async function createOfferServer(userId: string, params: CreateOfferParams): Promise<Offer> {
  const supabase = await createClient();

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, title, price_cents, status, seller_id')
    .eq('id', params.listingId)
    .single();

  if (listingError) {
    throw new Error(`Failed to fetch listing: ${listingError.message}`);
  }

  if (listing.status !== 'active') {
    throw new Error('Listing is not active');
  }

  if (userId === listing.seller_id) {
    throw new Error('Cannot make an offer on your own listing');
  }

  const validation = validateOfferAmount(params.amountCents, listing.price_cents);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { error: expireError } = await supabase
    .from('offers')
    .update({ status: 'expired' })
    .eq('buyer_id', userId)
    .eq('seller_id', params.sellerId)
    .eq('listing_id', params.listingId)
    .eq('status', 'pending');

  if (expireError) {
    throw new Error(`Failed to expire existing offers: ${expireError.message}`);
  }

  const thread = await createThreadServer({
    type: 'offer',
    createdBy: userId,
    participantIds: [userId, params.sellerId],
    roles: ['buyer', 'seller'],
    listingId: params.listingId,
  });

  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .insert({
      amount_cents: params.amountCents,
      buyer_id: userId,
      seller_id: params.sellerId,
      listing_id: params.listingId,
      thread_id: thread.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (offerError) {
    throw new Error(`Failed to create offer: ${offerError.message}`);
  }

  await createMessageServer({
    threadId: thread.id,
    senderId: userId,
    content: `Offer: ${(params.amountCents / 100).toFixed(2)}`,
    type: 'offer_node',
    metadata: { offerId: offer.id, amountCents: params.amountCents },
  });

  return offer;
}

export async function getOfferByIdServer(
  userId: string,
  offerId: string,
): Promise<OfferWithDetails | null> {
  const supabase = await createClient();

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();

  if (offerError) {
    throw new Error(`Failed to fetch offer: ${offerError.message}`);
  }

  if (offer.buyer_id !== userId && offer.seller_id !== userId) {
    return null;
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, price_cents, status')
    .eq('id', offer.listing_id)
    .maybeSingle();

  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, first_name, last_name, avatar_url')
    .in('id', [offer.buyer_id, offer.seller_id]);

  if (membersError) {
    throw new Error(`Failed to fetch offer participants: ${membersError.message}`);
  }

  const memberMap = new Map((members ?? []).map((m) => [m.id, m]));
  const buyerData = memberMap.get(offer.buyer_id);
  const sellerData = memberMap.get(offer.seller_id);

  return {
    ...offer,
    listing: listing ?? null,
    buyer: {
      id: buyerData?.id ?? offer.buyer_id,
      first_name: buyerData?.first_name ?? '',
      last_name: buyerData?.last_name ?? '',
      avatar_url: buyerData?.avatar_url ?? null,
    },
    seller: {
      id: sellerData?.id ?? offer.seller_id,
      first_name: sellerData?.first_name ?? '',
      last_name: sellerData?.last_name ?? '',
      avatar_url: sellerData?.avatar_url ?? null,
    },
  };
}

export async function acceptOfferServer(userId: string, offerId: string): Promise<Offer> {
  const supabase = await createClient();

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();

  if (offerError) {
    throw new Error(`Failed to fetch offer: ${offerError.message}`);
  }

  if (userId !== offer.seller_id) {
    throw new Error('Only the seller can accept an offer');
  }

  if (offer.status !== 'pending') {
    throw new Error('Offer is no longer pending');
  }

  const { data: updated, error: updateError } = await supabase
    .from('offers')
    .update({ status: 'accepted' })
    .eq('id', offerId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to accept offer: ${updateError.message}`);
  }

  await createMessageServer({
    threadId: offer.thread_id,
    senderId: userId,
    content: `Offer of $${(offer.amount_cents / 100).toFixed(2)} accepted`,
    type: 'system',
  });

  return updated;
}

export async function declineOfferServer(userId: string, offerId: string): Promise<Offer> {
  const supabase = await createClient();

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();

  if (offerError) {
    throw new Error(`Failed to fetch offer: ${offerError.message}`);
  }

  if (userId !== offer.seller_id) {
    throw new Error('Only the seller can decline an offer');
  }

  if (offer.status !== 'pending') {
    throw new Error('Offer is no longer pending');
  }

  const { data: updated, error: updateError } = await supabase
    .from('offers')
    .update({ status: 'declined' })
    .eq('id', offerId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to decline offer: ${updateError.message}`);
  }

  await createMessageServer({
    threadId: offer.thread_id,
    senderId: userId,
    content: 'Offer declined',
    type: 'system',
  });

  return updated;
}

export async function counterOfferServer(
  userId: string,
  offerId: string,
  params: CounterOfferParams,
): Promise<Offer> {
  const supabase = await createClient();

  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();

  if (offerError) {
    throw new Error(`Failed to fetch offer: ${offerError.message}`);
  }

  if (userId !== offer.seller_id) {
    throw new Error('Only the seller can counter an offer');
  }

  if (offer.status !== 'pending') {
    throw new Error('Offer is no longer pending');
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('price_cents')
    .eq('id', offer.listing_id)
    .single();

  if (listingError) {
    throw new Error(`Failed to fetch listing: ${listingError.message}`);
  }

  const validation = validateOfferAmount(params.amountCents, listing.price_cents);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { error: updateError } = await supabase
    .from('offers')
    .update({ status: 'countered' })
    .eq('id', offerId);

  if (updateError) {
    throw new Error(`Failed to update original offer: ${updateError.message}`);
  }

  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: counterOffer, error: counterError } = await supabase
    .from('offers')
    .insert({
      amount_cents: params.amountCents,
      buyer_id: offer.seller_id,
      seller_id: offer.buyer_id,
      listing_id: offer.listing_id,
      thread_id: offer.thread_id,
      parent_offer_id: offer.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (counterError) {
    throw new Error(`Failed to create counter offer: ${counterError.message}`);
  }

  await createMessageServer({
    threadId: offer.thread_id,
    senderId: userId,
    content: `Offer: ${(params.amountCents / 100).toFixed(2)}`,
    type: 'offer_node',
    metadata: { offerId: counterOffer.id, amountCents: params.amountCents },
  });

  return counterOffer;
}

export async function getOffersForListingServer(
  userId: string,
  listingId: string,
): Promise<Offer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('listing_id', listingId)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch offers for listing: ${error.message}`);
  }

  return data ?? [];
}

export async function expirePendingOffersServer(): Promise<{ expired: number }> {
  const supabase = createAdminClient();

  const { data: pendingExpired, error: pendingError } = await supabase
    .from('offers')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select();

  if (pendingError) {
    throw new Error(`Failed to expire pending offers: ${pendingError.message}`);
  }

  const checkoutCutoff = new Date(
    Date.now() - OFFER_CHECKOUT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: acceptedExpired, error: acceptedError } = await supabase
    .from('offers')
    .update({ status: 'expired' })
    .eq('status', 'accepted')
    .lt('updated_at', checkoutCutoff)
    .select();

  if (acceptedError) {
    throw new Error(`Failed to expire accepted offers: ${acceptedError.message}`);
  }

  return { expired: (pendingExpired?.length ?? 0) + (acceptedExpired?.length ?? 0) };
}
