'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineFlag, HiOutlineTruck } from 'react-icons/hi';
import PhotoGallery from '@/features/listings/components/photo-gallery';
import PhotoLightbox from '@/features/listings/components/photo-lightbox';
import SellerStrip from '@/features/listings/components/seller-strip';
import ExpandableSection from '@/features/listings/components/expandable-section';
import ConditionBadge from '@/features/listings/components/condition-badge';
import Button from '@/components/controls/button';
import { formatPrice } from '@/features/shared/utils/format';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import { getCategoryLabel } from '@/features/listings/constants/category';
import { useIncrementViewCount } from '@/features/listings/hooks/use-listings';
import type { ListingWithPhotos, SellerIdentity } from '@/features/listings/types/listing';
import styles from './listing-detail.module.scss';

type Props = {
  listing: ListingWithPhotos;
  seller: SellerIdentity | null;
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

  const shippingLabel =
    listing.shipping_paid_by === 'seller'
      ? 'Free Shipping'
      : listing.shipping_price_cents
        ? `Shipping: ${formatPrice(listing.shipping_price_cents)}`
        : 'Shipping: calculated at checkout';

  return (
    <div className={styles.page}>
      {/* Two-column wrapper at lg */}
      <div className={styles.layout}>
        {/* Left column: Gallery */}
        <div className={styles.galleryColumn}>
          <PhotoGallery photos={photos} title={listing.title} onPhotoTap={handlePhotoTap} />
        </div>

        {/* Right column: Details + Actions */}
        <div className={styles.detailsColumn}>
          {/* Condition badge */}
          <div className={styles.conditionRow}>
            <ConditionBadge condition={listing.condition} size="md" />
            {listing.quantity > 1 && (
              <span className={styles.quantityBadge}>{listing.quantity} available</span>
            )}
          </div>

          {/* Title */}
          <h1 className={styles.title}>{listing.title}</h1>

          {/* Price */}
          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(listing.price_cents)}</span>
          </div>

          {/* Shipping */}
          <div className={styles.shippingRow}>
            <HiOutlineTruck className={styles.shippingIcon} aria-hidden="true" />
            <span
              className={
                listing.shipping_paid_by === 'seller' ? styles.shippingFree : styles.shippingLabel
              }
            >
              {shippingLabel}
            </span>
          </div>

          {/* Action buttons */}
          {isSold ? (
            <div className={styles.soldBanner}>
              <span className={styles.soldText}>This listing has sold</span>
            </div>
          ) : isOwnListing ? (
            <div className={styles.actionButtons}>
              <Link href={`/dashboard/listings/${listing.id}/edit`}>
                <Button style="primary" fullWidth>
                  Edit listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className={styles.actionButtons}>
              <Button style="primary" fullWidth disabled ariaLabel="Buy Now — Coming Soon">
                Buy Now
              </Button>
              <Button
                style="secondary"
                fullWidth
                disabled
                outline
                ariaLabel="Make Offer — Coming Soon"
              >
                Make Offer
              </Button>
              <button type="button" className={styles.messageLink} disabled aria-disabled="true">
                Message Seller
              </button>
            </div>
          )}

          {/* Seller strip */}
          {seller && (
            <div className={styles.sellerSection}>
              <SellerStrip seller={seller} />
            </div>
          )}
        </div>
      </div>

      {/* Full-width sections below the fold */}
      <div className={styles.belowFold}>
        {/* About this listing */}
        {listing.description && (
          <section className={styles.contentSection}>
            <h2 className={styles.sectionTitle}>About this listing</h2>
            <ExpandableSection title="" maxCollapsedLines={4} defaultExpanded={false}>
              <p className={styles.descriptionText}>{listing.description}</p>
            </ExpandableSection>
          </section>
        )}

        {/* Product specs */}
        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>Product specs</h2>
          <div className={styles.specsTable}>
            <div className={styles.specRow}>
              <span className={styles.specLabel}>Condition</span>
              <span className={styles.specValue}>{conditionTier?.label ?? listing.condition}</span>
            </div>
            {listing.brand && (
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Brand</span>
                <span className={styles.specValue}>{listing.brand}</span>
              </div>
            )}
            {listing.model && (
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Model</span>
                <span className={styles.specValue}>{listing.model}</span>
              </div>
            )}
            {listing.category && (
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Category</span>
                <span className={styles.specValue}>{getCategoryLabel(listing.category)}</span>
              </div>
            )}
            {listing.location_state && (
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Location</span>
                <span className={styles.specValue}>
                  {listing.location_city ? `${listing.location_city}, ` : ''}
                  {listing.location_state}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Condition details accordion */}
        {conditionTier && (
          <section className={styles.contentSection}>
            <ExpandableSection title="Condition Details">
              <p className={styles.descriptionText}>{conditionTier.description}</p>
            </ExpandableSection>
          </section>
        )}

        {/* Report */}
        <div className={styles.reportRow}>
          <button type="button" className={styles.reportLink}>
            <HiOutlineFlag aria-hidden="true" />
            Report this listing
          </button>
        </div>
      </div>

      {/* Sticky Buy Now bar — mobile only */}
      {!isSold && !isOwnListing && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyPrice}>{formatPrice(listing.price_cents)}</div>
          <Button style="primary" disabled ariaLabel="Buy Now — Coming Soon">
            Buy Now
          </Button>
        </div>
      )}

      <PhotoLightbox
        photos={photos}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={listing.title}
      />
    </div>
  );
}
