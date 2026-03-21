'use client';

import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import * as Yup from 'yup';
import { createShopSchema } from '@/features/shops/validations/shop';
import {
  useCreateShop,
  useAddShopMember,
  useShopSlugCheck,
} from '@/features/shops/hooks/use-shops';
import { generateSlug } from '@/features/shared/utils/slug';
import useContextStore from '@/features/context/stores/context-store';
import { useToast } from '@/components/indicators/toast/context';
import Button from '@/components/controls/button';
import styles from './shop-creation-form.module.scss';

interface ShopCreationFormProps {
  ownerId: string;
}

type ShopCreationFormData = Yup.InferType<typeof createShopSchema>;

export default function ShopCreationForm({ ownerId }: ShopCreationFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const createShopMutation = useCreateShop();
  const addShopMemberMutation = useAddShopMember();

  const methods = useForm<ShopCreationFormData>({
    resolver: yupResolver(createShopSchema),
    mode: 'onBlur',
    defaultValues: {
      shopName: '',
      slug: '',
      description: '',
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid },
  } = methods;

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() from react-hook-form is inherently non-memoizable
  const watchedName = watch('shopName') ?? '';
  const watchedSlug = watch('slug') ?? '';

  useEffect(() => {
    if (watchedName.length > 0) {
      setValue('slug', generateSlug(watchedName), { shouldValidate: true });
    }
  }, [watchedName, setValue]);

  const { data: isSlugAvailable, isLoading: isCheckingSlug } = useShopSlugCheck(watchedSlug);

  const slugIsLongEnough = watchedSlug.length >= 2;
  const availabilityKnown = slugIsLongEnough && !isCheckingSlug;
  const slugIsTaken = availabilityKnown && isSlugAvailable === false;
  const canSubmit =
    isValid &&
    !errors.slug &&
    isSlugAvailable === true &&
    !createShopMutation.isPending &&
    !addShopMemberMutation.isPending;

  const isLoading = createShopMutation.isPending || addShopMemberMutation.isPending;

  const onSubmit = async (data: ShopCreationFormData) => {
    const shop = await createShopMutation.mutateAsync({
      shop_name: data.shopName,
      slug: data.slug,
      description: data.description || null,
      owner_id: ownerId,
      avatar_url: null,
    });
    await addShopMemberMutation.mutateAsync({
      shopId: shop.id,
      memberId: ownerId,
      role: 'owner',
    });
    useContextStore.getState().switchToShop(shop.id);
    showToast({
      type: 'success',
      message: 'Shop created!',
      description: `${shop.shop_name} is ready to go.`,
    });
    router.push('/dashboard');
  };

  const shopNameId = 'shop-name-input';
  const shopNameErrorId = 'shop-name-error';
  const slugId = 'shop-slug-input';
  const slugErrorId = 'shop-slug-error';
  const slugTakenErrorId = 'shop-slug-taken-error';
  const slugPreviewId = 'shop-slug-preview';
  const descriptionId = 'shop-description-input';
  const descriptionErrorId = 'shop-description-error';

  const slugDescribedBy = [
    errors.slug ? slugErrorId : null,
    slugIsTaken ? slugTakenErrorId : null,
    slugPreviewId,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormProvider {...methods}>
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.fieldGroup}>
          <label htmlFor={shopNameId} className={styles.label}>
            Shop name
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          </label>
          <input
            {...register('shopName')}
            id={shopNameId}
            type="text"
            className={`${styles.input}${errors.shopName ? ` ${styles.inputError}` : ''}`}
            aria-required="true"
            aria-invalid={!!errors.shopName}
            aria-describedby={errors.shopName ? shopNameErrorId : undefined}
            autoComplete="organization"
            placeholder="e.g. Bass Pro Kyle"
          />
          {errors.shopName && (
            <p id={shopNameErrorId} className={styles.errorText} role="alert">
              {errors.shopName.message}
            </p>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={slugId} className={styles.label}>
            Handle
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          </label>
          <div className={styles.inputRow}>
            <input
              {...register('slug')}
              id={slugId}
              type="text"
              className={`${styles.input}${errors.slug || slugIsTaken ? ` ${styles.inputError}` : ''}${availabilityKnown && isSlugAvailable ? ` ${styles.inputSuccess}` : ''}`}
              aria-required="true"
              aria-invalid={!!(errors.slug || slugIsTaken)}
              aria-describedby={slugDescribedBy || undefined}
              autoComplete="off"
              placeholder="e.g. bass-pro-kyle"
            />
            {availabilityKnown && !errors.slug && (
              <span className={styles.availabilityIcon}>
                {isSlugAvailable ? (
                  <>
                    <HiCheckCircle className={styles.iconSuccess} aria-hidden="true" />
                    <span className="sr-only">Handle is available</span>
                  </>
                ) : (
                  <>
                    <HiXCircle className={styles.iconError} aria-hidden="true" />
                    <span className="sr-only">Handle is taken</span>
                  </>
                )}
              </span>
            )}
          </div>
          {errors.slug && (
            <p id={slugErrorId} className={styles.errorText} role="alert">
              {errors.slug.message}
            </p>
          )}
          {slugIsTaken && !errors.slug && (
            <p id={slugTakenErrorId} className={styles.errorText} role="alert">
              That handle is already taken
            </p>
          )}
          {watchedSlug.length > 0 && (
            <p id={slugPreviewId} className={styles.slugPreview} aria-live="polite">
              @{watchedSlug}
            </p>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={descriptionId} className={styles.label}>
            Description
          </label>
          <textarea
            {...register('description')}
            id={descriptionId}
            className={`${styles.textarea}${errors.description ? ` ${styles.inputError}` : ''}`}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? descriptionErrorId : undefined}
            placeholder="Tell buyers about your shop..."
            maxLength={500}
            rows={4}
          />
          {errors.description && (
            <p id={descriptionErrorId} className={styles.errorText} role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className={styles.avatarNote}>
          <p>You can upload a shop avatar after creation in shop settings.</p>
        </div>

        <div className={styles.footer}>
          <Button
            type="submit"
            style="primary"
            fullWidth
            disabled={!canSubmit}
            loading={isLoading}
            ariaLabel="Create shop"
          >
            Create shop
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
