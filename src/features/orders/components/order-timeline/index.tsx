'use client';

import type { ReactNode } from 'react';
import { HiCheck } from 'react-icons/hi';
import styles from './order-timeline.module.scss';

export type TimelineStep = {
  label: string;
  description?: string;
  timestamp?: Date;
  icon?: ReactNode;
};

interface OrderTimelineProps {
  steps: TimelineStep[];
  currentStep: number;
  className?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OrderTimeline({ steps, currentStep, className }: OrderTimelineProps) {
  return (
    <ol
      className={`${styles.timeline}${className ? ` ${className}` : ''}`}
      aria-label="Order progress"
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        return (
          <li
            key={index}
            className={`${styles.step} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''} ${isPending ? styles.pending : ''}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <div className={styles.indicator}>
              <div className={styles.circle} aria-hidden="true">
                {isCompleted ? (
                  <HiCheck className={styles.checkIcon} />
                ) : (
                  step.icon && <span className={styles.stepIcon}>{step.icon}</span>
                )}
              </div>
              {index < steps.length - 1 && <div className={styles.line} aria-hidden="true" />}
            </div>
            <div className={styles.content}>
              <p className={styles.label}>{step.label}</p>
              {step.description && <p className={styles.description}>{step.description}</p>}
              {isCompleted && step.timestamp && (
                <time className={styles.timestamp} dateTime={step.timestamp.toISOString()}>
                  {formatDate(step.timestamp)}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
