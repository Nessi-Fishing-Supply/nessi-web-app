'use client';

import { useCallback, useState } from 'react';
import BottomSheet from '@/components/layout/bottom-sheet';
import { useToast } from '@/components/indicators/toast/context';
import { REPORT_REASONS } from '@/features/reports/constants/reasons';
import { useSubmitReport } from '@/features/reports/hooks/use-reports';
import { reportSchema } from '@/features/reports/validations/report';
import type { ReportReason, ReportTargetType } from '@/features/reports/types/report';
import styles from './report-bottom-sheet.module.scss';

interface ReportBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const MAX_DESCRIPTION_LENGTH = 1000;

export default function ReportBottomSheet({
  isOpen,
  onClose,
  targetType,
  targetId,
}: ReportBottomSheetProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
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

  const submitReport = useSubmitReport({
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
      await reportSchema.validate(formData);
    } catch {
      showToast({
        message: 'Invalid report',
        description: 'Please check your input and try again.',
        type: 'error',
      });
      return;
    }

    submitReport.mutate(formData);
  }, [selectedReason, targetType, targetId, description, showToast, submitReport]);

  const displayType = capitalizeFirst(targetType);
  const isOther = selectedReason === 'other';
  const descriptionLength = description.trim().length;
  const isNearLimit = descriptionLength > MAX_DESCRIPTION_LENGTH * 0.9;
  const isOverLimit = descriptionLength > MAX_DESCRIPTION_LENGTH;
  const isSubmitDisabled =
    selectedReason === null ||
    (isOther && descriptionLength === 0) ||
    isOverLimit ||
    submitReport.isPending;

  return (
    <BottomSheet title={`Report ${displayType}`} isOpen={isOpen} onClose={handleClose}>
      <fieldset className={styles.fieldset}>
        <legend className="sr-only">Why are you reporting this {targetType}?</legend>

        <div className={styles.reasonList}>
          {REPORT_REASONS.map((reason) => {
            const inputId = `report-reason-${reason.value}`;
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
                  name="report-reason"
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
        <label htmlFor="report-description" className={styles.descriptionLabel}>
          Additional details{isOther ? ' (required)' : ' (optional)'}
        </label>
        <textarea
          id="report-description"
          className={styles.descriptionTextarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide more context about your report..."
          rows={3}
          aria-required={isOther}
          aria-invalid={isOverLimit || undefined}
          aria-describedby="report-description-counter"
        />
        <span
          id="report-description-counter"
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
          aria-busy={submitReport.isPending}
          onClick={handleSubmit}
        >
          {submitReport.isPending ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </BottomSheet>
  );
}
