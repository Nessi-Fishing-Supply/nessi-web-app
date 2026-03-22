'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { HiChevronDown } from 'react-icons/hi';

import styles from './expandable-section.module.scss';

interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  maxCollapsedLines?: number;
}

export default function ExpandableSection({
  title,
  children,
  defaultExpanded = false,
  maxCollapsedLines,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  const isTruncationMode = maxCollapsedLines !== undefined;

  function handleToggle() {
    setIsExpanded((prev) => !prev);
  }

  if (isTruncationMode) {
    return (
      <div className={styles.truncationWrapper}>
        <div
          id={contentId}
          className={`${styles.truncationContent}${isExpanded ? ` ${styles.truncationContentExpanded}` : ''}`}
          style={
            !isExpanded
              ? ({ '--max-collapsed-lines': maxCollapsedLines } as React.CSSProperties)
              : undefined
          }
        >
          {children}
        </div>
        <button
          type="button"
          className={styles.truncationToggle}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={handleToggle}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.accordion}>
      <button
        type="button"
        className={styles.accordionToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={handleToggle}
      >
        <span className={styles.accordionTitle}>{title}</span>
        <HiChevronDown
          className={`${styles.accordionChevron}${isExpanded ? ` ${styles.accordionChevronOpen}` : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={contentId}
        className={`${styles.accordionBody}${isExpanded ? ` ${styles.accordionBodyOpen}` : ''}`}
      >
        <div className={styles.accordionInner}>{children}</div>
      </div>
    </div>
  );
}
