import { notFound } from 'next/navigation';
import { getListingWithSellerServer } from '@/features/listings/services/listing-server';
import { formatPrice } from '@/features/listings/utils/format';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import { createClient } from '@/libs/supabase/server';
import ListingDetail from './listing-detail';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingWithSellerServer(id);

  if (!listing) {
    return { title: 'Listing Not Found' };
  }

  const conditionTier = CONDITION_TIERS.find((t) => t.value === listing.condition);
  const conditionLabel = conditionTier?.label ?? listing.condition;
  const title = `${listing.title} — ${conditionLabel}`;

  const price = formatPrice(listing.price_cents);
  const description = listing.description
    ? listing.description.slice(0, 160)
    : `${listing.title} — ${price} on Nessi`;

  const image = listing.cover_photo_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListingWithSellerServer(id);

  if (!listing || (listing.status !== 'active' && listing.status !== 'sold')) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const { seller, ...listingData } = listing;

  return <ListingDetail listing={listingData} seller={seller} currentUserId={currentUserId} />;
}
