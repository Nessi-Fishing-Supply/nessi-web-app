'use client';

import ConditionBadge from '@/features/listings/components/condition-badge';
import { useWizardStore } from '@/features/listings/components/create-wizard/wizard-store-context';
import { getCategoryLabel } from '@/features/listings/constants/category';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import type { WizardPhoto } from '@/features/listings/stores/wizard-photo-store';
import type { ListingCategory, ListingCondition } from '@/features/listings/types/listing';
import { calculateFee, calculateNet, formatPrice } from '@/features/shared/utils/format';

import styles from './review-step.module.scss';

const MAX_DESCRIPTION_LENGTH = 300;

interface ReviewStepProps {
  photos: WizardPhoto[];
}

export default function ReviewStep({ photos }: ReviewStepProps) {
  const store = useWizardStore();
  const category = store.use.category();
  const condition = store.use.condition();
  const title = store.use.title();
  const description = store.use.description();
  const priceCents = store.use.priceCents();
  const shippingPreference = store.use.shippingPreference();
  const shippingPaidBy = store.use.shippingPaidBy();
  const weightOz = store.use.weightOz();

  const coverPhoto = photos[0] ?? null;
  const coverUrl = coverPhoto?.previewUrl ?? null;

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

      <div className={styles.previewCard}>
        <div className={styles.previewPhoto}>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={title || 'Listing cover photo'}
              className={styles.previewImage}
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

      <div className={styles.summary}>
        <h3 className={styles.summaryHeading}>Details</h3>

        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Photos</dt>
            <dd className={styles.detailValue}>{photos.length}</dd>
          </div>

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
