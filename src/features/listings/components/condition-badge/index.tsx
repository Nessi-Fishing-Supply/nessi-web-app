'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import type { ListingCondition } from '@/features/listings/types/listing';

import styles from './condition-badge.module.scss';

interface ConditionBadgeProps {
  condition: ListingCondition;
  size?: 'sm' | 'md';
}

export default function ConditionBadge({ condition, size = 'sm' }: ConditionBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const tier = CONDITION_TIERS.find((t) => t.value === condition);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function determinePlacement() {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    setPlacement(rect.top < 120 ? 'bottom' : 'top');
  }

  function handleMouseEnter() {
    determinePlacement();
    setIsOpen(true);
  }

  function handleMouseLeave() {
    setIsOpen(false);
  }

  function handleClick() {
    determinePlacement();
    setIsOpen((prev) => !prev);
  }

  if (!tier) return null;

  return (
    <span ref={wrapperRef} className={styles.wrapper}>
      <button
        ref={badgeRef}
        type="button"
        className={`${styles.badge} ${styles[size]}`}
        style={
          {
            '--condition-badge-bg': tier.color,
            '--condition-badge-text': tier.textColor,
          } as React.CSSProperties
        }
        aria-describedby={isOpen ? popoverId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {tier.label}
      </button>

      {isOpen && (
        <span id={popoverId} role="tooltip" className={`${styles.popover} ${styles[placement]}`}>
          <span className={styles.arrow} aria-hidden="true" />
          {tier.description}
        </span>
      )}
    </span>
  );
}
