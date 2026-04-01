'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { useToast } from '@/components/indicators/toast/context';
import { useCreateThread } from '@/features/messaging/hooks/use-create-thread';
import { FetchError } from '@/libs/fetch-error';

import styles from './message-button.module.scss';

type MessageButtonProps = {
  participantId: string;
  participantName: string;
  className?: string;
};

export default function MessageButton({
  participantId,
  participantName,
  className,
}: MessageButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const { mutate, isPending } = useCreateThread({
    onSuccess: (thread) => {
      router.push(`/messages/${thread.id}`);
    },
    onError: (error) => {
      if (error instanceof FetchError && error.status === 403) {
        showToast({
          message: 'Direct messaging unavailable',
          description: 'Direct messaging requires a prior transaction with this user.',
          type: 'error',
        });
        return;
      }
      showToast({
        message: 'Something went wrong',
        description: 'Please try again.',
        type: 'error',
      });
    },
  });

  const handleClick = useCallback(() => {
    if (!isAuthenticated || !user) {
      showToast({
        message: 'Sign in to message',
        description: `Create an account or sign in to message ${participantName}.`,
        type: 'error',
      });
      return;
    }

    mutate({
      type: 'direct',
      participantIds: [user.id, participantId],
      roles: ['initiator', 'recipient'],
    });
  }, [isAuthenticated, user, participantId, participantName, mutate, showToast]);

  const buttonClassName = [styles.button, styles.sm].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={[buttonClassName, className].filter(Boolean).join(' ')}
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Message ${participantName}`}
      aria-busy={isPending}
    >
      Message
    </button>
  );
}
