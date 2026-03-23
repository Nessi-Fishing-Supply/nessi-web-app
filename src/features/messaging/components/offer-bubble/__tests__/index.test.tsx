/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import OfferBubble from '../index';

const FUTURE_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now

const baseProps = {
  amount: 4500,
  originalPrice: 6000,
  expiresAt: FUTURE_DATE,
  status: 'pending' as const,
};

beforeEach(() => {
  vi.useFakeTimers();
  cleanup();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OfferBubble', () => {
  it('displays the formatted offer amount', () => {
    render(<OfferBubble {...baseProps} />);
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('shows Accept, Counter, and Decline buttons when status is pending', () => {
    const onAccept = vi.fn();
    const onCounter = vi.fn();
    const onDecline = vi.fn();
    render(
      <OfferBubble
        {...baseProps}
        onAccept={onAccept}
        onCounter={onCounter}
        onDecline={onDecline}
      />,
    );
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /counter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('hides action buttons when status is accepted', () => {
    render(
      <OfferBubble
        {...baseProps}
        status="accepted"
        onAccept={vi.fn()}
        onCounter={vi.fn()}
        onDecline={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /counter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });

  it('hides action buttons when status is declined', () => {
    render(
      <OfferBubble
        {...baseProps}
        status="declined"
        onAccept={vi.fn()}
        onCounter={vi.fn()}
        onDecline={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });

  it('shows Accepted badge when status is accepted', () => {
    render(<OfferBubble {...baseProps} status="accepted" />);
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });

  it('shows Declined badge when status is declined', () => {
    render(<OfferBubble {...baseProps} status="declined" />);
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  it('calls onAccept when Accept button is clicked', () => {
    const onAccept = vi.fn();
    render(<OfferBubble {...baseProps} onAccept={onAccept} />);
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onCounter when Counter button is clicked', () => {
    const onCounter = vi.fn();
    render(<OfferBubble {...baseProps} onCounter={onCounter} />);
    fireEvent.click(screen.getByRole('button', { name: /counter/i }));
    expect(onCounter).toHaveBeenCalledTimes(1);
  });

  it('shows a discount note when offer is below original price', () => {
    render(<OfferBubble {...baseProps} />);
    // 4500 is 25% off 6000
    expect(screen.getByText(/25% off/)).toBeInTheDocument();
  });

  it('shows an expiry countdown when status is pending', () => {
    render(<OfferBubble {...baseProps} />);
    expect(screen.getByText(/expires in/i)).toBeInTheDocument();
  });
});
