'use client';

import { HiCheck } from 'react-icons/hi';
import styles from './wizard-progress.module.scss';

interface WizardProgressProps {
  currentStep: number;
  totalSteps?: number;
  shippingSkipped?: boolean;
}

const STEPS = [
  { number: 1, label: 'Photos' },
  { number: 2, label: 'Category' },
  { number: 3, label: 'Details' },
  { number: 4, label: 'Pricing' },
  { number: 5, label: 'Shipping' },
  { number: 6, label: 'Review' },
];

export default function WizardProgress({
  currentStep,
  totalSteps = 6,
  shippingSkipped = false,
}: WizardProgressProps) {
  const steps = STEPS.slice(0, totalSteps);

  return (
    <nav aria-label="Listing creation progress" className={styles.nav}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isSkipped = step.number === 5 && shippingSkipped;

          let itemClass = styles.item;
          if (isCompleted) itemClass += ` ${styles.itemCompleted}`;
          else if (isCurrent) itemClass += ` ${styles.itemCurrent}`;
          else if (isSkipped) itemClass += ` ${styles.itemSkipped}`;
          else itemClass += ` ${styles.itemFuture}`;

          return (
            <li
              key={step.number}
              className={itemClass}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {index > 0 && <span className={styles.connector} aria-hidden="true" />}
              <span className={styles.circle} aria-hidden="true">
                {isCompleted ? (
                  <HiCheck className={styles.checkIcon} />
                ) : (
                  <span className={styles.number}>{step.number}</span>
                )}
              </span>
              <span className={styles.label}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
