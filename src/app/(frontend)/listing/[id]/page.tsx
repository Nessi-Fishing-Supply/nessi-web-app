import { notFound } from 'next/navigation';
import { getListingByIdServer } from '@/features/listings/services/listing-server';
import { formatPrice } from '@/features/listings/utils/format';
import ListingDetailClient from './item-id-page';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingByIdServer(id);

  if (!listing) {
    return { title: 'Listing Not Found' };
  }

  const price = formatPrice(listing.price_cents);
  const image = listing.listing_photos?.[0]?.image_url;

  return {
    title: listing.title,
    description: listing.description || `${listing.title} — ${price} on Nessi`,
    openGraph: {
      title: listing.title,
      description: listing.description || `${listing.title} — ${price} on Nessi`,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListingByIdServer(id);

  if (!listing) {
    notFound();
  }

  return <ListingDetailClient listing={listing} />;
}
