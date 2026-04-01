'use client';

import { useRef, useState, useCallback, useEffect, type KeyboardEvent } from 'react';
import { HiPaperAirplane, HiPlus, HiTag, HiShare, HiCamera } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useSendMessage } from '@/features/messaging/hooks/use-send-message';
import { useSendImages } from '@/features/messaging/hooks/use-send-images';
import ImagePreviewStrip from '@/features/messaging/components/image-preview-strip';
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
const MAX_IMAGE_FILES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ComposeBar({
  threadId,
  disabled = false,
  threadType,
  currentUserRole,
  onMakeOffer,
  onTyping,
}: ComposeBarProps) {
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingBroadcast = useRef(0);

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

  const { mutate: sendImages, isPending: isUploadPending } = useSendImages({
    threadId,
    currentUserId: user?.id ?? '',
    onSuccess: () => {
      setSelectedFiles([]);
      setImageError(null);
    },
    onError: (error) => {
      setImageError(error.message);
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

      // Throttle typing broadcasts to once per second
      const now = Date.now();
      if (onTyping && now - lastTypingBroadcast.current > 1000) {
        lastTypingBroadcast.current = now;
        onTyping();
      }
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

  const handlePhotoSelect = useCallback(() => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    setImageError(null);

    // Validate file types
    const invalidType = files.find((f) => !ACCEPTED_IMAGE_TYPES.includes(f.type));
    if (invalidType) {
      setImageError('Invalid file type. Accepted: JPEG, PNG, WebP, GIF');
      return;
    }

    // Validate file sizes
    const oversized = files.find((f) => f.size > MAX_IMAGE_SIZE);
    if (oversized) {
      setImageError('One or more files exceed the 5MB limit');
      return;
    }

    // Limit to max files
    const accepted = files.slice(0, MAX_IMAGE_FILES);
    if (files.length > MAX_IMAGE_FILES) {
      setImageError(
        `Maximum ${MAX_IMAGE_FILES} images per message. Only the first ${MAX_IMAGE_FILES} were selected.`,
      );
    }

    setSelectedFiles(accepted);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendImages = useCallback(() => {
    if (selectedFiles.length === 0 || isUploadPending) return;
    sendImages(selectedFiles);
  }, [selectedFiles, isUploadPending, sendImages]);

  const showMakeOffer = threadType === 'inquiry' && currentUserRole === 'buyer' && !!onMakeOffer;

  // Menu cannot be open while compose bar is disabled
  const isMenuOpen = menuOpen && !disabled;

  const handleMakeOffer = useCallback(() => {
    setMenuOpen(false);
    onMakeOffer?.();
  }, [onMakeOffer]);

  const isSendDisabled = !value.trim() || isPending || isUploadPending || disabled;

  return (
    <form
      role="form"
      aria-label="Compose message"
      className={styles.composeBar}
      aria-busy={isUploadPending}
    >
      <ImagePreviewStrip
        files={selectedFiles}
        onRemove={handleRemoveFile}
        onSend={handleSendImages}
        isPending={isUploadPending}
      />

      {imageError && (
        <p className={styles.imageError} role="alert">
          {imageError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className={styles.hiddenFileInput}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
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
              onClick={handlePhotoSelect}
            >
              <HiCamera aria-hidden="true" className={styles.menuItemIcon} />
              Send Photo
            </button>
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
