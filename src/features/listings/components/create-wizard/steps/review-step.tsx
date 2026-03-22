'use client';

import Image from 'next/image';

import ConditionBadge from '@/features/listings/components/condition-badge';
import { getCategoryLabel } from '@/features/listings/constants/category';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import useCreateWizardStore from '@/features/listings/stores/create-wizard-store';
import type { ListingCategory, ListingCondition } from '@/features/listings/types/listing';
import { calculateFee, calculateNet, formatPrice } from '@/features/listings/utils/format';

import styles from './review-step.module.scss';

const MAX_DESCRIPTION_LENGTH = 300;

export default function ReviewStep() {
  const photos = useCreateWizardStore.use.photos();
  const category = useCreateWizardStore.use.category();
  const condition = useCreateWizardStore.use.condition();
  const title = useCreateWizardStore.use.title();
  const description = useCreateWizardStore.use.description();
  const fishingHistory = useCreateWizardStore.use.fishingHistory();
  const priceCents = useCreateWizardStore.use.priceCents();
  const shippingPreference = useCreateWizardStore.use.shippingPreference();
  const shippingPaidBy = useCreateWizardStore.use.shippingPaidBy();
  const weightOz = useCreateWizardStore.use.weightOz();
  const packageDimensions = useCreateWizardStore.use.packageDimensions();

  const coverPhoto = photos.find((p) => p.position === 0) ?? photos[0] ?? null;
  const coverUrl = coverPhoto?.thumbnail_url ?? coverPhoto?.image_url ?? null;

  const conditionTier = condition ? CONDITION_TIERS.find((t) => t.value === condition) : null;

  const feeCents = calculateFee(priceCents);
  const netCents = calculateNet(priceCents);

  const isDescriptionTruncated = description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = isDescriptionTruncated
    ? `${description.slice(0, MAX_DESCRIPTION_LENGTH)}…`
    : description;

  return (
    <div className={styles.step}>
      <h2 className={styles.heading}>Review your listing</h2>

      {/* Preview card */}
      <div className={styles.previewCard}>
        <div className={styles.previewPhoto}>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={title || 'Listing cover photo'}
              fill
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 300px"
              style={{ objectFit: 'cover' }}
              priority
            />
          ) : (
            <div className={styles.previewPhotoEmpty} aria-hidden="true" />
          )}
          {condition && (
            <span className={styles.previewBadge}>
              <ConditionBadge condition={condition as ListingCondition} size="sm" />
            </span>
          )}
        </div>
        <div className={styles.previewContent}>
          <p className={styles.previewTitle}>{title || 'Untitled listing'}</p>
          <p className={styles.previewPrice}>{formatPrice(priceCents)}</p>
          {conditionTier && <p className={styles.previewCondition}>{conditionTier.label}</p>}
        </div>
      </div>

      {/* Details summary */}
      <div className={styles.summary}>
        <h3 className={styles.summaryHeading}>Details</h3>

        <dl className={styles.detailList}>
          {category && (
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Category</dt>
              <dd className={styles.detailValue}>
                {getCategoryLabel(category as ListingCategory)}
              </dd>
            </div>
          )}

          {conditionTier && (
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Condition</dt>
              <dd className={styles.detailValue}>{conditionTier.label}</dd>
            </div>
          )}

          {description && (
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Description</dt>
              <dd className={styles.detailValue}>
                {displayDescription}
                {isDescriptionTruncated && <span className={styles.truncated}> (truncated)</span>}
              </dd>
            </div>
          )}

          {fishingHistory && (
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Fishing History</dt>
              <dd className={styles.detailValue}>{fishingHistory}</dd>
            </div>
          )}

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Shipping</dt>
            <dd className={styles.detailValue}>
              {shippingPreference === 'local_pickup' ? 'Local pickup only' : "I'll ship"}
            </dd>
          </div>

          {shippingPreference === 'ship' && (
            <>
              {weightOz > 0 && (
                <div className={styles.detailRow}>
                  <dt className={styles.detailLabel}>Weight</dt>
                  <dd className={styles.detailValue}>{weightOz} oz</dd>
                </div>
              )}

              {packageDimensions && (
                <div className={styles.detailRow}>
                  <dt className={styles.detailLabel}>Dimensions</dt>
                  <dd className={styles.detailValue}>
                    {packageDimensions.length}&quot; × {packageDimensions.width}&quot; ×{' '}
                    {packageDimensions.height}&quot;
                  </dd>
                </div>
              )}

              {shippingPaidBy && (
                <div className={styles.detailRow}>
                  <dt className={styles.detailLabel}>Shipping paid by</dt>
                  <dd className={styles.detailValue}>
                    {shippingPaidBy === 'buyer' ? 'Buyer' : 'Seller'}
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>

        <div className={styles.feeBreakdown}>
          <h3 className={styles.summaryHeading}>Earnings</h3>
          <dl className={styles.feeList}>
            <div className={styles.feeRow}>
              <dt className={styles.feeLabel}>List price</dt>
              <dd className={styles.feeValue}>{formatPrice(priceCents)}</dd>
            </div>
            <div className={styles.feeRow}>
              <dt className={styles.feeLabel}>Nessi fee</dt>
              <dd className={styles.feeValue}>−{formatPrice(feeCents)}</dd>
            </div>
            <div className={`${styles.feeRow} ${styles.feeRowNet}`}>
              <dt className={styles.feeLabelNet}>You receive</dt>
              <dd className={styles.feeValueNet}>{formatPrice(netCents)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
