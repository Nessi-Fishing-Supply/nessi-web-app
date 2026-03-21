'use client';

import React, { useState, useRef } from 'react';
import { HiUser, HiOfficeBuilding } from 'react-icons/hi';

import Modal from '@/components/layout/modal';
import Button from '@/components/controls/button';
import { useToast } from '@/components/indicators/toast/context';
import { useUpdateMember } from '@/features/members/hooks/use-member';

import styles from './seller-onboarding-modal.module.scss';

interface SellerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: (path: 'free' | 'shop') => void;
}

type SellerPath = 'free' | 'shop';

const SELLER_OPTIONS: {
  value: SellerPath;
  icon: React.ReactNode;
  title: string;
  description: string;
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
  },
];

export default function SellerOnboardingModal({
  isOpen,
  onClose,
  userId,
  onComplete,
}: SellerOnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selected, setSelected] = useState<SellerPath | null>(null);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { showToast } = useToast();
  const updateMember = useUpdateMember();

  const handleClose = () => {
    onClose();
    setStep(1);
    setTermsAccepted(false);
    setSelected(null);
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSelect = (value: SellerPath) => {
    setSelected(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % SELLER_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + SELLER_OPTIONS.length) % SELLER_OPTIONS.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(SELLER_OPTIONS[index].value);
      return;
    }

    if (nextIndex !== null) {
      handleSelect(SELLER_OPTIONS[nextIndex].value);
      cardRefs.current[nextIndex]?.focus();
    }
  };

  const handleGetStarted = () => {
    if (!selected) return;

    if (selected === 'shop') {
      onComplete('shop');
      return;
    }

    updateMember.mutate(
      { userId, data: { is_seller: true } },
      {
        onSuccess: () => {
          showToast({
            message: 'Welcome, seller!',
            description: "You're all set to start listing your gear.",
            type: 'success',
          });
          onComplete('free');
        },
        onError: () => {
          showToast({
            message: 'Something went wrong',
            description: 'Please try again.',
            type: 'error',
          });
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabelledBy="seller-onboarding-heading">
      {step === 1 && (
        <div className={styles.container}>
          <h2 id="seller-onboarding-heading" className={styles.heading}>
            Start selling on Nessi
          </h2>

          <div className={styles.body}>
            <p className={styles.bodyText}>
              Nessi is a community marketplace for fishing gear. When you become a seller, you can
              list your used or new tackle, rods, reels, and more — reaching buyers across the
              country.
            </p>
            <p className={styles.bodyText}>
              All transactions are processed securely through our payment system. Funds are held
              until the buyer confirms receipt, protecting both parties.
            </p>
            <p className={styles.bodyText}>
              As a seller, you are responsible for accurate item descriptions, fair pricing, and
              shipping within the agreed timeframe. Misrepresenting items may result in account
              suspension.
            </p>
            <p className={styles.bodyText}>
              Ready to get started? Choose how you want to sell — list on your profile for free or
              set up a full shop with premium features.
            </p>
          </div>

          <div className={styles.termsRow}>
            <input
              id="seller-terms-checkbox"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              aria-required="true"
              className={styles.checkbox}
            />
            <label htmlFor="seller-terms-checkbox" className={styles.termsLabel}>
              I agree to Nessi&apos;s seller terms and marketplace policies
            </label>
          </div>

          <div className={styles.footer}>
            <Button fullWidth disabled={!termsAccepted} onClick={handleNext}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.container}>
          <div className={styles.backRow}>
            <button type="button" className={styles.back} onClick={handleBack}>
              Back
            </button>
          </div>

          <h2 id="seller-onboarding-heading" className={styles.heading}>
            How do you want to sell?
          </h2>

          <div className={styles.cards} role="radiogroup" aria-label="How do you want to sell?">
            {SELLER_OPTIONS.map((option, index) => {
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
            <Button
              fullWidth
              disabled={!selected}
              loading={updateMember.isPending}
              onClick={handleGetStarted}
            >
              Get started
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
