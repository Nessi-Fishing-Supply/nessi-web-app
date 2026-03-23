'use client';

import React from 'react';
import { HiClock, HiCalendar } from 'react-icons/hi';
import styles from './date-time-display.module.scss';

interface DateTimeDisplayProps {
  date: Date | string;
  format: 'relative' | 'absolute' | 'countdown' | 'response-time';
  urgent?: boolean;
  className?: string;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Listed just now';
  if (diffMins < 60) return `Listed ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `Listed ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `Listed ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return `Listed ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
}

function formatAbsolute(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatCountdown(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'Offer expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) return `Offer expires in ${diffHours} hr${diffHours === 1 ? '' : 's'}`;
  return `Offer expires in ${diffMins} min${diffMins === 1 ? '' : 's'}`;
}

function formatResponseTime(date: Date): string {
  const hours = date.getHours();
  if (hours < 1) return 'Responds in < 1 hr';
  if (hours < 2) return 'Responds in < 2 hrs';
  if (hours < 24) return `Responds in < ${hours} hrs`;
  return 'Responds within a day';
}

const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({ date, format, urgent, className }) => {
  const parsed = toDate(date);

  const isCalendar = format === 'absolute';
  const Icon = isCalendar ? HiCalendar : HiClock;

  let text: string;
  switch (format) {
    case 'relative':
      text = formatRelative(parsed);
      break;
    case 'absolute':
      text = formatAbsolute(parsed);
      break;
    case 'countdown':
      text = formatCountdown(parsed);
      break;
    case 'response-time':
      text = formatResponseTime(parsed);
      break;
  }

  return (
    <span className={`${styles.root} ${urgent ? styles.urgent : ''} ${className ?? ''}`}>
      <Icon className={styles.icon} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
};

export default DateTimeDisplay;
