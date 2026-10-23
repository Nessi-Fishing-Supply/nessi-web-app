'use client';

import { HiOutlineFlag } from 'react-icons/hi';
import FlagBottomSheet from '@/features/flags/components/flag-bottom-sheet';
import { useFlagTarget } from '@/features/flags/hooks/use-flag-target';
import type { FlagTargetType } from '@/features/flags/types/flag';
import styles from './flag-trigger.module.scss';

interface FlagTriggerProps {
  currentUserId: string | null;
  isOwnEntity: boolean;
  targetType: FlagTargetType;
  targetId: string;
}

export default function FlagTrigger({
  currentUserId,
  isOwnEntity,
  targetType,
  targetId,
}: FlagTriggerProps) {
  const { openFlagSheet, isOpen, close } = useFlagTarget({
    target_type: targetType,
    target_id: targetId,
  });

  if (!currentUserId || isOwnEntity) return null;

  return (
    <>
      <button type="button" className={styles.triggerButton} onClick={openFlagSheet}>
        <HiOutlineFlag aria-hidden="true" />
        Report this {targetType}
      </button>

      <FlagBottomSheet
        isOpen={isOpen}
        onClose={close}
        targetType={targetType}
        targetId={targetId}
      />
    </>
  );
}
