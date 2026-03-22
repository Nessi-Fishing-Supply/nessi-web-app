'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PhotoGallery from '@/features/listings/components/photo-gallery';
import PhotoLightbox from '@/features/listings/components/photo-lightbox';
import SellerStrip from '@/features/listings/components/seller-strip';
import ExpandableSection from '@/features/listings/components/expandable-section';
import ConditionBadge from '@/features/listings/components/condition-badge';
import Button from '@/components/controls/button';
import { formatPrice } from '@/features/listings/utils/format';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import { useIncrementViewCount } from '@/features/listings/hooks/use-listings';
import type { ListingWithPhotos, SellerProfile } from '@/features/listings/types/listing';
import styles from './listing-detail.module.scss';

type Props = {
  listing: ListingWithPhotos;
  seller: SellerProfile | null;
  currentUserId: string | null;
};

export default function ListingDetail({ listing, seller, currentUserId }: Props) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { mutate: incrementView } = useIncrementViewCount();

  useEffect(() => {
    incrementView(listing.id);
  }, [listing.id, incrementView]);

  const photos = listing.listing_photos ?? [];
  const isSold = listing.status === 'sold';
  const isOwnListing = currentUserId === listing.seller_id;

  const conditionTier = CONDITION_TIERS.find((t) => t.value === listing.condition);

  function handlePhotoTap(index: number) {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  }

  return (
    <div className={styles.page}>
      <PhotoGallery photos={photos} title={listing.title} onPhotoTap={handlePhotoTap} />

      <PhotoLightbox
        photos={photos}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={listing.title}
      />

      <div className={styles.priceRow}>
        <p className={styles.price}>{formatPrice(listing.price_cents)}</p>
        <ConditionBadge condition={listing.condition} size="md" />
      </div>

      <div className={styles.title}>
        <ExpandableSection title="" maxCollapsedLines={2}>
          {listing.title}
        </ExpandableSection>
      </div>

      {seller && (
        <div className={styles.section}>
          <SellerStrip seller={seller} />
        </div>
      )}

      {listing.description && (
        <div className={styles.section}>
          <ExpandableSection title="" maxCollapsedLines={3} defaultExpanded={false}>
            {listing.description}
          </ExpandableSection>
        </div>
      )}

      {conditionTier && (
        <div className={styles.section}>
          <ExpandableSection title="Condition Details">{conditionTier.description}</ExpandableSection>
        </div>
      )}

      <div className={styles.section}>
        <p>Shipping: calculated at checkout</p>
      </div>

      {isSold ? (
        <div className={styles.soldBanner}>This listing has sold</div>
      ) : isOwnListing ? (
        <div className={styles.editButton}>
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
            <Button style="primary" fullWidth>
              Edit listing
            </Button>
          </Link>
        </div>
      ) : (
        <div className={styles.actions}>
          <span className={styles.disabledLink} aria-disabled="true">
            Make Offer — Coming Soon
          </span>
          <span className={styles.disabledLink} aria-disabled="true">
            Message Seller — Coming Soon
          </span>
        </div>
      )}

      <button type="button" className={styles.reportLink}>
        Report this listing
      </button>

      {!isSold && !isOwnListing && (
        <div className={styles.stickyBar}>
          <Button style="primary" fullWidth disabled>
            Buy Now — Coming Soon
          </Button>
        </div>
      )}
    </div>
  );
}
