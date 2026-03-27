'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HiOutlineTruck } from 'react-icons/hi';
import { ReportTrigger } from '@/features/reports';
import PhotoGallery from '@/features/listings/components/photo-gallery';
import PhotoLightbox from '@/features/listings/components/photo-lightbox';
import SellerStrip from '@/features/listings/components/seller-strip';
import ExpandableSection from '@/features/listings/components/expandable-section';
import ConditionBadge from '@/features/listings/components/condition-badge';
import ShareButton from '@/features/listings/components/share-button';
import SimilarItemsStrip from '@/features/listings/components/similar-items-strip';
import MoreFromSellerStrip from '@/features/listings/components/more-from-seller-strip';
import { useRouter } from 'next/navigation';
import Button from '@/components/controls/button';
import AddToCartButton from '@/features/cart/components/add-to-cart-button';
import { formatPrice } from '@/features/shared/utils/format';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import { getCategoryLabel } from '@/features/listings/constants/category';
import { useIncrementViewCount, useDuplicateListing } from '@/features/listings/hooks/use-listings';
import { addRecentlyViewed } from '@/features/recently-viewed';
import { useToast } from '@/components/indicators/toast/context';
import useContextStore from '@/features/context/stores/context-store';
import type { ListingWithPhotos, SellerIdentity } from '@/features/listings/types/listing';
import styles from './listing-detail.module.scss';

type Props = {
  listing: ListingWithPhotos;
  seller: SellerIdentity | null;
  currentUserId: string | null;
};

export default function ListingDetail({ listing, seller, currentUserId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { mutate: incrementView } = useIncrementViewCount();
  const duplicateMutation = useDuplicateListing();

  useEffect(() => {
    incrementView(listing.id);
    addRecentlyViewed(listing.id);
  }, [listing.id, incrementView]);

  const activeContext = useContextStore.use.activeContext();
  const isShopContext = activeContext.type === 'shop';

  const photos = listing.listing_photos ?? [];
  const isSold = listing.status === 'sold';
  // Context-aware ownership: in shop context, only show "Edit" for that shop's listings.
  // In member context, only show "Edit" for member-owned listings (shop_id is null).
  const isOwnListing = isShopContext
    ? listing.shop_id === activeContext.shopId
    : currentUserId === listing.seller_id && !listing.shop_id;
  // Detect member viewing their own shop's listing — show "Switch to shop" prompt
  const isOwnShopListing =
    !isShopContext && currentUserId === listing.seller_id && !!listing.shop_id;
  const ownShopName = isOwnShopListing && seller?.type === 'shop' ? seller.shop_name : null;
  const conditionTier = CONDITION_TIERS.find((t) => t.value === listing.condition);

  function handleDuplicate() {
    duplicateMutation.mutate(listing.id, {
      onSuccess: (newDraft) => {
        showToast({
          type: 'success',
          message: 'Listing duplicated as draft',
          description: 'Add photos to publish.',
        });
        router.push(`/dashboard/listings/new?draftId=${newDraft.id}`);
      },
      onError: () =>
        showToast({
          type: 'error',
          message: 'Failed to duplicate',
          description: 'Please try again.',
        }),
    });
  }

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
            <ShareButton listingId={listing.id} listingTitle={listing.title} />
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
            <>
              <div className={styles.soldBanner}>
                <span className={styles.soldText}>This listing has sold</span>
              </div>
              {isOwnListing && (
                <div className={styles.actionButtons}>
                  <Button
                    style="secondary"
                    outline
                    fullWidth
                    onClick={handleDuplicate}
                    disabled={duplicateMutation.isPending}
                    loading={duplicateMutation.isPending}
                  >
                    {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate as Draft'}
                  </Button>
                </div>
              )}
            </>
          ) : isOwnListing ? (
            <div className={styles.actionButtons}>
              <Link href={`/dashboard/listings/${listing.id}/edit`}>
                <Button style="primary" fullWidth>
                  Edit listing
                </Button>
              </Link>
              <Button
                style="secondary"
                outline
                fullWidth
                onClick={handleDuplicate}
                disabled={duplicateMutation.isPending}
                loading={duplicateMutation.isPending}
              >
                {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate as Draft'}
              </Button>
            </div>
          ) : isOwnShopListing ? (
            <>
              <div className={styles.shopContextNotice}>
                <span className={styles.shopContextText}>
                  You&apos;re an admin of {ownShopName ?? 'this shop'}. Switch to edit this listing.
                </span>
              </div>
              <div className={styles.actionButtons}>
                <Button style="primary" fullWidth disabled ariaLabel="Buy Now — Coming Soon">
                  Buy Now
                </Button>
                <AddToCartButton
                  listingId={listing.id}
                  priceCents={listing.price_cents}
                  currentUserId={currentUserId}
                  sellerId={listing.seller_id}
                  shopId={listing.shop_id}
                  fullWidth
                />
                <Button
                  style="secondary"
                  fullWidth
                  disabled
                  outline
                  ariaLabel="Make Offer — Coming Soon"
                >
                  Make Offer
                </Button>
              </div>
            </>
          ) : isShopContext ? (
            <div className={styles.shopContextNotice}>
              <span className={styles.shopContextText}>
                Switch to your member account to purchase
              </span>
            </div>
          ) : (
            <div className={styles.actionButtons}>
              <Button style="primary" fullWidth disabled ariaLabel="Buy Now — Coming Soon">
                Buy Now
              </Button>
              <AddToCartButton
                listingId={listing.id}
                priceCents={listing.price_cents}
                currentUserId={currentUserId}
                sellerId={listing.seller_id}
                shopId={listing.shop_id}
                fullWidth
              />
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

        {/* Similar items */}
        <SimilarItemsStrip
          listingId={listing.id}
          category={listing.category}
          condition={listing.condition}
        />

        {/* More from this seller */}
        {seller && (
          <MoreFromSellerStrip
            sellerId={listing.seller_id}
            seller={seller}
            shopId={listing.shop_id ?? undefined}
            excludeListingId={listing.id}
          />
        )}

        {/* Report */}
        <ReportTrigger
          currentUserId={currentUserId}
          isOwnEntity={isOwnListing}
          targetType="listing"
          targetId={listing.id}
        />
      </div>

      {/* Sticky Buy Now bar — mobile only, hidden for own member listings and shop context */}
      {!isSold && !isOwnListing && !isShopContext && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyPrice}>{formatPrice(listing.price_cents)}</div>
          <AddToCartButton
            listingId={listing.id}
            priceCents={listing.price_cents}
            currentUserId={currentUserId}
            sellerId={listing.seller_id}
            shopId={listing.shop_id}
            fullWidth={false}
          />
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
