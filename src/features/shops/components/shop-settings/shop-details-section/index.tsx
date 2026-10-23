'use client';

import { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import AvatarUpload from '@/components/controls/avatar-upload';
import InlineEdit from '@/components/controls/inline-edit';
import HeroBannerUpload from '@/features/shops/components/hero-banner-upload';
import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import {
  useUpdateShop,
  useUpdateShopSlug,
  useShopSlugCheck,
} from '@/features/shops/hooks/use-shops';
import type { Shop } from '@/features/shops/types/shop';
import { useToast } from '@/components/indicators/toast/context';
import styles from './shop-details-section.module.scss';

interface ShopDetailsSectionProps {
  shop: Shop;
  readOnly?: boolean;
}

export default function ShopDetailsSection({ shop, readOnly = false }: ShopDetailsSectionProps) {
  const { showToast } = useToast();
  const updateShop = useUpdateShop();
  const updateShopSlug = useUpdateShopSlug();

  const [draftSlug, setDraftSlug] = useState('');
  const [debouncedSlug, setDebouncedSlug] = useState('');
  const [isSlugModalOpen, setIsSlugModalOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState('');

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
    setPendingSlug(newSlug);
    setIsSlugModalOpen(true);
  };

  const handleSlugModalCancel = () => {
    setIsSlugModalOpen(false);
    setPendingSlug('');
  };

  const handleSlugConfirm = async () => {
    try {
      await updateShopSlug.mutateAsync({ shopId: shop.id, slug: pendingSlug });
      setIsSlugModalOpen(false);
      setPendingSlug('');
      setDraftSlug('');
      setDebouncedSlug('');
      showToast({
        message: 'Saved',
        description: 'Your shop handle has been updated.',
        type: 'success',
        duration: 2000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const is409 = message.includes('taken') || message.includes('409');
      showToast({
        message: 'Update failed',
        description: is409
          ? 'That handle was just taken by someone else'
          : 'Failed to update handle',
        type: 'error',
        duration: 4000,
      });
    }
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

  const handleHeroBannerUpload = async (url: string) => {
    await updateShop.mutateAsync({ id: shop.id, data: { hero_banner_url: url } });
    showToast({
      message: 'Saved',
      description: 'Your shop banner has been updated.',
      type: 'success',
      duration: 2000,
    });
  };

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.heading}>Shop Details</h2>
        <div className={styles.content}>
          <div className={styles.avatarSection}>
            <AvatarUpload
              name={shop.shop_name ?? ''}
              avatarUrl={shop.avatar_url ?? null}
              onUpload={handleAvatarUpload}
              uploadUrl="/api/shops/avatar"
              extraFormData={{ shopId: shop.id }}
              disabled={readOnly || updateShop.isPending}
            />
          </div>

          <div className={styles.bannerSection}>
            <span className={styles.fieldLabel}>Shop Banner</span>
            <HeroBannerUpload
              shopId={shop.id}
              heroBannerUrl={shop.hero_banner_url ?? null}
              onUpload={handleHeroBannerUpload}
              onError={() =>
                showToast({
                  message: 'Upload failed',
                  description: 'Failed to upload banner. Please try again.',
                  type: 'error',
                  duration: 4000,
                })
              }
              disabled={readOnly || updateShop.isPending}
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
                  readOnly={readOnly}
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
                  readOnly={readOnly}
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
                {draftSlug.length > 0 && (
                  <p className={styles.slugPreview} aria-live="polite">
                    @{draftSlug}
                  </p>
                )}
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
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isSlugModalOpen}
        onClose={handleSlugModalCancel}
        ariaLabel="Confirm handle change"
      >
        <div className={styles.modalContent}>
          <h2>Change your handle?</h2>
          <p>Changing your handle will break any existing links to your shop. Are you sure?</p>
          <div className={styles.modalActions}>
            <Button
              style="secondary"
              onClick={handleSlugModalCancel}
              disabled={updateShopSlug.isPending}
            >
              Cancel
            </Button>
            <Button
              style="primary"
              onClick={handleSlugConfirm}
              loading={updateShopSlug.isPending}
              ariaLabel="Confirm handle change"
            >
              Yes, change handle
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
