'use client';

import React, { useState, useRef } from 'react';
import { HiUser } from 'react-icons/hi';
import { HiOfficeBuilding } from 'react-icons/hi';

import Button from '@/components/controls/button';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import type { OnboardingSellerType } from '@/features/members/types/onboarding';

import styles from './step-seller-type.module.scss';

const SELLER_TYPE_OPTIONS: {
  value: OnboardingSellerType;
  icon: React.ReactNode;
  title: string;
  description: string;
  note?: string;
}[] = [
  {
    value: 'free',
    icon: <HiUser aria-hidden="true" />,
    title: 'Sell on your profile',
    description: 'List items for free with basic features. Great for casual sellers.',
  },
  {
    value: 'shop',
    icon: <HiOfficeBuilding aria-hidden="true" />,
    title: 'Create a shop',
    description: 'Premium features, custom branding, and unlimited listings.',
    note: 'Set up after onboarding from your dashboard',
  },
];

export default function StepSellerType() {
  const sellerTypeData = useOnboardingStore.use.sellerTypeData();
  const setSellerTypeData = useOnboardingStore.use.setSellerTypeData();
  const nextStep = useOnboardingStore.use.nextStep();
  const prevStep = useOnboardingStore.use.prevStep();

  const [selected, setSelected] = useState<OnboardingSellerType | null>(sellerTypeData.sellerType);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSelect = (value: OnboardingSellerType) => {
    setSelected(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSellerTypeData({ sellerType: selected });
    nextStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % SELLER_TYPE_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + SELLER_TYPE_OPTIONS.length) % SELLER_TYPE_OPTIONS.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(SELLER_TYPE_OPTIONS[index].value);
      return;
    }

    if (nextIndex !== null) {
      handleSelect(SELLER_TYPE_OPTIONS[nextIndex].value);
      cardRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={prevStep}>
          Back
        </button>
      </div>

      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>How do you want to sell?</h2>
        <p className={styles.stepSubtitle}>Choose how you&#39;d like to list your gear on Nessi.</p>
      </div>

      <div className={styles.cards} role="radiogroup" aria-label="How do you want to sell?">
        {SELLER_TYPE_OPTIONS.map((option, index) => {
          const isSelected = selected === option.value;
          return (
            <div
              key={option.value}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!selected && index === 0) ? 0 : -1}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <span className={styles.cardIcon}>{option.icon}</span>
              <span className={styles.cardTitle}>{option.title}</span>
              <span className={styles.cardDescription}>{option.description}</span>
              {option.note && <span className={styles.cardNote}>{option.note}</span>}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Button type="submit" fullWidth disabled={!selected}>
          Next
        </Button>
      </div>
    </form>
  );
}
