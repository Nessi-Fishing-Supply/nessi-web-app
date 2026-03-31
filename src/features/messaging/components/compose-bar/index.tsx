'use client';

import { useRef, useState, useCallback, type KeyboardEvent } from 'react';
import { HiPaperAirplane, HiPlus } from 'react-icons/hi';
import { useSendMessage } from '@/features/messaging/hooks/use-send-message';
import styles from './compose-bar.module.scss';

interface ComposeBarProps {
  threadId: string;
  disabled?: boolean;
}

const MAX_ROWS = 5;

export default function ComposeBar({ threadId, disabled = false }: ComposeBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate, isPending } = useSendMessage({
    threadId,
    onSuccess: () => {
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    },
  });

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 24;
    const maxHeight = lineHeight * MAX_ROWS;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      adjustHeight();
    },
    [adjustHeight],
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isPending || disabled) return;
    mutate(trimmed);
  }, [value, isPending, disabled, mutate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const isSendDisabled = !value.trim() || isPending || disabled;

  return (
    <form role="form" aria-label="Compose message" className={styles.composeBar}>
      <button
        type="button"
        className={styles.actionBtn}
        aria-label="Open action menu"
        disabled
        tabIndex={-1}
      >
        <HiPlus aria-hidden="true" />
      </button>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message"
        aria-label="Type a message"
        aria-multiline="true"
        rows={1}
        disabled={disabled}
      />

      <button
        type="button"
        className={styles.sendBtn}
        onClick={handleSend}
        disabled={isSendDisabled}
        aria-label="Send message"
        aria-busy={isPending}
      >
        <HiPaperAirplane aria-hidden="true" className={styles.sendIcon} />
      </button>
    </form>
  );
}
