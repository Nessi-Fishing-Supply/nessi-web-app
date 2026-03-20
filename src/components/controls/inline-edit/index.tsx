'use client';

import { useEffect, useRef, useState } from 'react';
import { HiCheck, HiPencil, HiX } from 'react-icons/hi';
import styles from './inline-edit.module.scss';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  onChange?: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  validating?: boolean;
  ariaLabel?: string;
}

export default function InlineEdit({
  value,
  onSave,
  onChange,
  maxLength,
  multiline = false,
  placeholder,
  validating = false,
  ariaLabel,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      if (multiline) {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [isEditing, multiline]);

  const handleActivate = () => {
    setDraft(value);
    onChange?.(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(value);
    onChange?.('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
      return;
    }
    if (multiline) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    }
  };

  const charCount = draft.length;
  const isOverLimit = maxLength !== undefined && charCount > maxLength;
  const showCounter = multiline && maxLength !== undefined;
  const isDisabled = saving || validating;

  if (!isEditing) {
    return (
      <button
        type="button"
        className={styles.displayValue}
        onClick={handleActivate}
        aria-label={`Edit ${ariaLabel ?? 'value'}`}
      >
        <span className={styles.displayText}>{value || <span className={styles.placeholder}>{placeholder}</span>}</span>
        <span className={styles.editIcon} aria-hidden="true">
          <HiPencil />
        </span>
      </button>
    );
  }

  return (
    <div className={styles.editContainer}>
      {multiline ? (
        <textarea
          ref={textareaRef}
          className={`${styles.input} ${styles.textarea}`}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); onChange?.(e.target.value); }}
          onKeyDown={handleKeyDown}
          maxLength={maxLength !== undefined ? maxLength + 1 : undefined}
          placeholder={placeholder}
          aria-label={ariaLabel ?? 'Edit value'}
          aria-multiline="true"
          disabled={isDisabled}
          rows={3}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); onChange?.(e.target.value); }}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={ariaLabel ?? 'Edit value'}
          disabled={isDisabled}
        />
      )}

      {showCounter && (
        <span
          className={`${styles.charCounter} ${isOverLimit ? styles.charCounterOver : ''}`}
          aria-live="polite"
        >
          {charCount} / {maxLength}
        </span>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleSave}
          disabled={isDisabled || isOverLimit}
          aria-label="Save"
          aria-busy={saving}
        >
          {saving ? <span className={styles.spinner} aria-hidden="true" /> : <HiCheck aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.cancelBtn}`}
          onClick={handleCancel}
          disabled={isDisabled}
          aria-label="Cancel"
        >
          <HiX aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
