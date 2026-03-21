'use client';

import { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import AvatarUpload from '@/features/members/components/avatar-upload';
import InlineEdit from '@/components/controls/inline-edit';
import { useUpdateShop, useShopSlugCheck } from '@/features/shops/hooks/use-shops';
import type { Shop } from '@/features/shops/types/shop';
import { useToast } from '@/components/indicators/toast/context';
import styles from './shop-details-section.module.scss';

interface ShopDetailsSectionProps {
  shop: Shop;
}

export default function ShopDetailsSection({ shop }: ShopDetailsSectionProps) {
  const { showToast } = useToast();
  const updateShop = useUpdateShop();

  const [draftSlug, setDraftSlug] = useState('');
  const [debouncedSlug, setDebouncedSlug] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(draftSlug);
    }, 400);
    return () => clearTimeout(timer);
  }, [draftSlug]);

  const isCurrentSlug = debouncedSlug.toLowerCase() === (shop.slug ?? '').toLowerCase();

  const { data: isAvailable, isLoading: isChecking } = useShopSlugCheck(
    isCurrentSlug || debouncedSlug.length < 2 ? '' : debouncedSlug,
  );

  const availabilityKnown = debouncedSlug.length >= 2 && !isChecking && !isCurrentSlug;
  const slugAvailable = isCurrentSlug || (availabilityKnown && isAvailable === true);
  const slugTaken = !isCurrentSlug && availabilityKnown && isAvailable === false;

  const showAvailabilityIcon = draftSlug.length >= 2 && debouncedSlug.length >= 2;

  const handleSlugChange = (val: string) => {
    setDraftSlug(val);
  };

  const handleShopNameSave = async (newName: string) => {
    await updateShop.mutateAsync({ id: shop.id, data: { shop_name: newName } });
    showToast({
      message: 'Saved',
      description: 'Your shop name has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleSlugSave = async (newSlug: string) => {
    if (slugTaken) return;
    await updateShop.mutateAsync({ id: shop.id, data: { slug: newSlug } });
    setDraftSlug('');
    setDebouncedSlug('');
    showToast({
      message: 'Saved',
      description: 'Your shop handle has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleDescriptionSave = async (newDesc: string) => {
    await updateShop.mutateAsync({ id: shop.id, data: { description: newDesc || null } });
    showToast({
      message: 'Saved',
      description: 'Your shop description has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  const handleAvatarUpload = async (url: string) => {
    await updateShop.mutateAsync({ id: shop.id, data: { avatar_url: url } });
    showToast({
      message: 'Saved',
      description: 'Your shop photo has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Shop Details</h2>
      <div className={styles.content}>
        <div className={styles.avatarSection}>
          <AvatarUpload
            displayName={shop.shop_name ?? ''}
            avatarUrl={shop.avatar_url ?? null}
            onUpload={handleAvatarUpload}
            uploadUrl="/api/shops/avatar"
            extraFormData={{ shopId: shop.id }}
            disabled={updateShop.isPending}
          />
        </div>

        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Shop name</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={shop.shop_name ?? ''}
                onSave={handleShopNameSave}
                placeholder="Add a shop name"
                ariaLabel="shop name"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Handle</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={shop.slug ?? ''}
                onSave={handleSlugSave}
                onChange={handleSlugChange}
                placeholder="Add a handle"
                validating={isChecking || slugTaken}
                ariaLabel="shop handle"
              />
              {showAvailabilityIcon && slugAvailable && !isChecking && (
                <span className={styles.availabilityIcon}>
                  <HiCheckCircle className={styles.iconSuccess} aria-hidden="true" />
                  <span className="sr-only">Handle is available</span>
                </span>
              )}
              {showAvailabilityIcon && slugTaken && (
                <span className={styles.availabilityIcon}>
                  <HiXCircle className={styles.iconError} aria-hidden="true" />
                  <span className="sr-only">Handle is taken</span>
                </span>
              )}
              {slugTaken && (
                <p className={styles.errorText} role="alert">
                  That handle is already taken
                </p>
              )}
              <p className={styles.warningText}>
                Changing your handle will break existing links to your shop.
              </p>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Description</span>
            <div className={styles.fieldValue}>
              <InlineEdit
                value={shop.description ?? ''}
                onSave={handleDescriptionSave}
                maxLength={500}
                multiline
                placeholder="Tell buyers about your shop"
                ariaLabel="shop description"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
