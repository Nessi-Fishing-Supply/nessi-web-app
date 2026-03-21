import React from 'react';
import { HiCheck } from 'react-icons/hi';
import styles from './progress-indicator.module.scss';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps = 3 }) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className={styles.container} aria-label="Onboarding progress">
      {steps.map((step, index) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isFuture = step > currentStep;

        let srText = '';
        if (isCompleted) srText = `Step ${step} of ${totalSteps}, completed`;
        else if (isCurrent) srText = `Step ${step} of ${totalSteps}, current`;
        else srText = `Step ${step} of ${totalSteps}`;

        const stepClass = isCompleted
          ? `${styles.step} ${styles.completed}`
          : isCurrent
            ? `${styles.step} ${styles.current}`
            : `${styles.step} ${styles.future}`;

        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <div
                className={`${styles.line} ${step <= currentStep ? styles.lineCompleted : styles.linePending}`}
                aria-hidden="true"
              />
            )}
            <div
              className={stepClass}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={srText}
            >
              {isCompleted ? (
                <>
                  <HiCheck aria-hidden="true" />
                  <span className="sr-only">{srText}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">{step}</span>
                  <span className="sr-only">{srText}</span>
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
