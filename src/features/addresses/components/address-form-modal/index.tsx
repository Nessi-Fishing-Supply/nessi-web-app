'use client';

import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Modal from '@/components/layout/modal';
import Input from '@/components/controls/input';
import Select from '@/components/controls/select';
import Checkbox from '@/components/controls/checkbox';
import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useCreateAddress, useUpdateAddress } from '@/features/addresses/hooks/use-addresses';
import { addressSchema } from '@/features/addresses/validations/address';
import { US_STATES } from '@/features/listings/config/us-states';
import type { Address, AddressFormData } from '@/features/addresses/types/address';

import styles from './address-form-modal.module.scss';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Address | null;
}

export default function AddressFormModal({ isOpen, onClose, address }: AddressFormModalProps) {
  const isEditMode = !!address;
  const { showToast } = useToast();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();

  const methods = useForm<AddressFormData>({
    resolver: yupResolver(addressSchema) as any,
    defaultValues: address
      ? {
          label: address.label,
          line1: address.line1,
          line2: address.line2 ?? '',
          city: address.city,
          state: address.state,
          zip: address.zip,
          is_default: address.is_default,
        }
      : {
          label: '',
          line1: '',
          line2: '',
          city: '',
          state: '',
          zip: '',
          is_default: false,
        },
  });

  useEffect(() => {
    if (isOpen) {
      methods.reset(
        address
          ? {
              label: address.label,
              line1: address.line1,
              line2: address.line2 ?? '',
              city: address.city,
              state: address.state,
              zip: address.zip,
              is_default: address.is_default,
            }
          : {
              label: '',
              line1: '',
              line2: '',
              city: '',
              state: '',
              zip: '',
              is_default: false,
            },
      );
    }
  }, [isOpen, address, methods]);

  const onSubmit = (data: AddressFormData) => {
    if (isEditMode && address) {
      updateAddress.mutate(
        { addressId: address.id, data },
        {
          onSuccess: () => {
            showToast({
              message: 'Address updated',
              description: 'Your address has been saved.',
              type: 'success',
            });
            onClose();
          },
          onError: () => {
            showToast({
              message: 'Something went wrong',
              description: 'Failed to update address. Please try again.',
              type: 'error',
            });
          },
        },
      );
    } else {
      createAddress.mutate(data, {
        onSuccess: () => {
          showToast({
            message: 'Address added',
            description: 'Your new address has been saved.',
            type: 'success',
          });
          onClose();
        },
        onError: () => {
          showToast({
            message: 'Something went wrong',
            description: 'Failed to save address. Please try again.',
            type: 'error',
          });
        },
      });
    }
  };

  const headingId = 'address-form-modal-heading';
  const isPending = createAddress.isPending || updateAddress.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy={headingId}>
      <div className={styles.container}>
        <h2 id={headingId} className={styles.heading}>
          {isEditMode ? 'Edit Address' : 'Add Address'}
        </h2>

        <FormProvider {...methods}>
          <form className={styles.form} onSubmit={methods.handleSubmit(onSubmit)} noValidate>
            <Input
              name="label"
              label="Label"
              placeholder="e.g., Home, Work"
              isRequired
              autoComplete="off"
            />

            <Input
              name="line1"
              label="Address Line 1"
              placeholder="Street address"
              isRequired
              autoComplete="address-line1"
            />

            <Input
              name="line2"
              label="Address Line 2"
              placeholder="Apt, suite, unit (optional)"
              autoComplete="address-line2"
            />

            <div className={styles.cityStateZip}>
              <div className={styles.cityField}>
                <Input name="city" label="City" isRequired autoComplete="address-level2" />
              </div>
              <div className={styles.stateField}>
                <Select
                  name="state"
                  label="State"
                  options={[...US_STATES]}
                  placeholder="Select state"
                />
              </div>
              <div className={styles.zipField}>
                <Input
                  name="zip"
                  label="ZIP Code"
                  placeholder="12345"
                  isRequired
                  autoComplete="postal-code"
                />
              </div>
            </div>

            <Checkbox name="is_default" label="Set as default address" />

            <div className={styles.actions}>
              <Button type="button" style="secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" style="primary" loading={isPending} disabled={isPending}>
                {isEditMode ? 'Save Changes' : 'Add Address'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </Modal>
  );
}
