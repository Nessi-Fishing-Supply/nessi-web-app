'use client';

import React, { useState, useRef } from 'react';
import { HiShoppingBag } from 'react-icons/hi';
import { HiCurrencyDollar } from 'react-icons/hi';

import Button from '@/components/controls/button';
import useOnboardingStore from '@/features/members/stores/onboarding-store';
import type { OnboardingIntent } from '@/features/members/types/onboarding';

import styles from './step-intent.module.scss';

const INTENT_OPTIONS: {
  value: OnboardingIntent;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    value: 'buyer',
    icon: <HiShoppingBag aria-hidden="true" />,
    title: "I'm here to buy",
    description: 'Browse and purchase fishing gear from other anglers.',
  },
  {
    value: 'seller',
    icon: <HiCurrencyDollar aria-hidden="true" />,
    title: 'I want to buy and sell',
    description: 'List your gear for sale and shop from others.',
  },
];

export default function StepIntent() {
  const intentData = useOnboardingStore.use.intentData();
  const setIntentData = useOnboardingStore.use.setIntentData();
  const nextStep = useOnboardingStore.use.nextStep();
  const prevStep = useOnboardingStore.use.prevStep();

  const [selected, setSelected] = useState<OnboardingIntent | null>(intentData.intent);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSelect = (value: OnboardingIntent) => {
    setSelected(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIntentData({ intent: selected });
    nextStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % INTENT_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + INTENT_OPTIONS.length) % INTENT_OPTIONS.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(INTENT_OPTIONS[index].value);
      return;
    }

    if (nextIndex !== null) {
      handleSelect(INTENT_OPTIONS[nextIndex].value);
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
        <h2 className={styles.stepTitle}>How do you plan to use Nessi?</h2>
        <p className={styles.stepSubtitle}>
          You can always change this later in your account settings.
        </p>
      </div>

      <div className={styles.cards} role="radiogroup" aria-label="How do you plan to use Nessi?">
        {INTENT_OPTIONS.map((option, index) => {
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
