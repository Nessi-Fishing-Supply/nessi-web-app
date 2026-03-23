/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DateTimeDisplay from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('DateTimeDisplay', () => {
  it('renders relative format with clock icon text', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    render(<DateTimeDisplay date={twoHoursAgo} format="relative" />);
    expect(screen.getByText(/listed 2 hours ago/i)).toBeInTheDocument();
  });

  it('renders absolute format as a human-readable date', () => {
    const date = new Date('2026-03-14T12:00:00Z');
    render(<DateTimeDisplay date={date} format="absolute" />);
    // Should contain "March" as part of the formatted date
    expect(screen.getByText(/march/i)).toBeInTheDocument();
  });

  it('renders countdown format for a future date', () => {
    const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
    render(<DateTimeDisplay date={fourHoursFromNow} format="countdown" />);
    expect(screen.getByText(/offer expires in/i)).toBeInTheDocument();
  });

  it('applies urgent styles when urgent prop is true', () => {
    const date = new Date(Date.now() - 60 * 1000);
    const { container } = render(<DateTimeDisplay date={date} format="relative" urgent />);
    // The root span should include the urgent class
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/urgent/);
  });

  it('accepts a string date and renders without error', () => {
    render(<DateTimeDisplay date="2025-06-15T12:00:00Z" format="absolute" />);
    // June 15 won't shift to a different month in any UTC-adjacent timezone
    expect(screen.getByText(/june/i)).toBeInTheDocument();
  });

  it('renders "Offer expired" when countdown date is in the past', () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    render(<DateTimeDisplay date={pastDate} format="countdown" />);
    expect(screen.getByText(/offer expired/i)).toBeInTheDocument();
  });
});
