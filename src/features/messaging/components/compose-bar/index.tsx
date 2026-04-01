'use client';

import { useRef, useState, useCallback, useEffect, type KeyboardEvent } from 'react';
import { HiPaperAirplane, HiPlus, HiTag, HiShare } from 'react-icons/hi';
import { useSendMessage } from '@/features/messaging/hooks/use-send-message';
import type { ThreadType } from '@/features/messaging/types/thread';
import type { ParticipantRole } from '@/features/messaging/types/thread';
import styles from './compose-bar.module.scss';

interface ComposeBarProps {
  threadId: string;
  disabled?: boolean;
  threadType?: ThreadType;
  currentUserRole?: ParticipantRole;
  onMakeOffer?: () => void;
  onTyping?: () => void;
}

const MAX_ROWS = 5;

export default function ComposeBar({
  threadId,
  disabled = false,
  threadType,
  currentUserRole,
  onMakeOffer,
  onTyping,
}: ComposeBarProps) {
  const [value, setValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionBtnRef = useRef<HTMLButtonElement>(null);

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
      onTyping?.();
    },
    [adjustHeight, onTyping],
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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        actionBtnRef.current &&
        !actionBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        actionBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [menuOpen]);

  const showMakeOffer = threadType === 'inquiry' && currentUserRole === 'buyer' && !!onMakeOffer;

  // Menu cannot be open while compose bar is disabled
  const isMenuOpen = menuOpen && !disabled;

  const handleMakeOffer = useCallback(() => {
    setMenuOpen(false);
    onMakeOffer?.();
  }, [onMakeOffer]);

  const isSendDisabled = !value.trim() || isPending || disabled;

  return (
    <form role="form" aria-label="Compose message" className={styles.composeBar}>
      <div className={styles.actionMenuAnchor}>
        <button
          ref={actionBtnRef}
          type="button"
          className={`${styles.actionBtn}${!disabled ? ` ${styles.actionBtnEnabled}` : ''}`}
          aria-label="Open action menu"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          disabled={disabled}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <HiPlus aria-hidden="true" />
        </button>

        {isMenuOpen && (
          <div ref={menuRef} className={styles.actionMenu} role="menu">
            {showMakeOffer && (
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={handleMakeOffer}
              >
                <HiTag aria-hidden="true" className={styles.menuItemIcon} />
                Make an Offer
              </button>
            )}
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              disabled
              aria-disabled="true"
            >
              <HiShare aria-hidden="true" className={styles.menuItemIcon} />
              Share a Listing
            </button>
          </div>
        )}
      </div>

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
