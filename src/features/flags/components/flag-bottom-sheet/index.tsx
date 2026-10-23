'use client';

import { useCallback, useState } from 'react';
import BottomSheet from '@/components/layout/bottom-sheet';
import { useToast } from '@/components/indicators/toast/context';
import { FLAG_REASONS } from '@/features/flags/constants/reasons';
import { useSubmitFlag } from '@/features/flags/hooks/use-flags';
import { flagSchema } from '@/features/flags/validations/flag';
import type { FlagReason, FlagTargetType } from '@/features/flags/types/flag';
import styles from './flag-bottom-sheet.module.scss';

interface FlagBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: FlagTargetType;
  targetId: string;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const MAX_DESCRIPTION_LENGTH = 1000;

export default function FlagBottomSheet({
  isOpen,
  onClose,
  targetType,
  targetId,
}: FlagBottomSheetProps) {
  const [selectedReason, setSelectedReason] = useState<FlagReason | null>(null);
  const [description, setDescription] = useState('');
  const { showToast } = useToast();

  const resetForm = useCallback(() => {
    setSelectedReason(null);
    setDescription('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const submitFlag = useSubmitFlag({
    onSuccess: () => {
      handleClose();
      showToast({
        message: 'Report submitted',
        description: 'Thank you for helping keep Nessi safe.',
        type: 'success',
      });
    },
    onDuplicate: () => {
      showToast({
        message: 'Already reported',
        description: `You have already reported this ${targetType}.`,
        type: 'error',
      });
    },
    onError: () => {
      showToast({
        message: 'Something went wrong',
        description: 'Please try again later.',
        type: 'error',
      });
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;

    const formData = {
      target_type: targetType,
      target_id: targetId,
      reason: selectedReason,
      ...(description.trim() ? { description: description.trim() } : {}),
    };

    try {
      await flagSchema.validate(formData);
    } catch {
      showToast({
        message: 'Invalid report',
        description: 'Please check your input and try again.',
        type: 'error',
      });
      return;
    }

    submitFlag.mutate(formData);
  }, [selectedReason, targetType, targetId, description, showToast, submitFlag]);

  const displayType = capitalizeFirst(targetType);
  const isOther = selectedReason === 'other';
  const descriptionLength = description.trim().length;
  const isNearLimit = descriptionLength > MAX_DESCRIPTION_LENGTH * 0.9;
  const isOverLimit = descriptionLength > MAX_DESCRIPTION_LENGTH;
  const isSubmitDisabled =
    selectedReason === null ||
    (isOther && descriptionLength === 0) ||
    isOverLimit ||
    submitFlag.isPending;

  return (
    <BottomSheet title={`Report ${displayType}`} isOpen={isOpen} onClose={handleClose}>
      <fieldset className={styles.fieldset}>
        <legend className="sr-only">Why are you reporting this {targetType}?</legend>

        <div className={styles.reasonList}>
          {FLAG_REASONS.map((reason) => {
            const inputId = `flag-reason-${reason.value}`;
            const isSelected = selectedReason === reason.value;

            return (
              <label
                key={reason.value}
                htmlFor={inputId}
                className={`${styles.reasonRow}${isSelected ? ` ${styles.reasonRowSelected}` : ''}`}
              >
                <input
                  type="radio"
                  id={inputId}
                  name="flag-reason"
                  value={reason.value}
                  checked={isSelected}
                  onChange={() => setSelectedReason(reason.value)}
                  className={styles.radioInput}
                />
                <span className={styles.radioCircle} aria-hidden="true" />
                <span className={styles.reasonContent}>
                  <span className={styles.reasonName}>{reason.label}</span>
                  <span className={styles.reasonDescription}>{reason.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.descriptionSection}>
        <label htmlFor="flag-description" className={styles.descriptionLabel}>
          Additional details{isOther ? ' (required)' : ' (optional)'}
        </label>
        <textarea
          id="flag-description"
          className={styles.descriptionTextarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide more context about your report..."
          rows={3}
          aria-required={isOther}
          aria-invalid={isOverLimit || undefined}
          aria-describedby="flag-description-counter"
        />
        <span
          id="flag-description-counter"
          className={`${styles.charCounter}${isNearLimit ? ` ${styles.charCounterWarning}` : ''}${isOverLimit ? ` ${styles.charCounterError}` : ''}`}
          aria-live="polite"
        >
          {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
        </span>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.submitButton}
          disabled={isSubmitDisabled}
          aria-busy={submitFlag.isPending}
          onClick={handleSubmit}
        >
          {submitFlag.isPending ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </BottomSheet>
  );
}
