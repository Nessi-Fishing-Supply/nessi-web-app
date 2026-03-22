'use client';

import type { ListingWithPhotos } from '@/features/listings/types/listing';
import { formatPrice } from '@/features/listings/utils/format';
import ConditionBadge from '@/features/listings/components/condition-badge';
import Image from 'next/image';

export default function ListingDetailClient({ listing }: { listing: ListingWithPhotos }) {
  const photos = listing.listing_photos ?? [];

  return (
    <div>
      <h1>{listing.title}</h1>
      <ConditionBadge condition={listing.condition} size="md" />
      <p>{listing.description}</p>
      <p>Price: {formatPrice(listing.price_cents)}</p>
      {listing.location_state && (
        <p>
          {listing.location_city ? `${listing.location_city}, ` : ''}
          {listing.location_state}
        </p>
      )}

      <div>
        {photos.map((photo, index) => (
          <Image
            key={photo.id}
            src={photo.image_url}
            alt={`${listing.title} image ${index + 1}`}
            width={600}
            height={600}
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 600px"
            style={{ objectFit: 'cover' }}
            priority={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
