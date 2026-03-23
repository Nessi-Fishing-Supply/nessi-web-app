/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import OfferUi from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const futureDate = new Date(Date.now() + 3_600_000); // 1 hour from now

describe('OfferUi — pending status', () => {
  it('renders the offer amount and original price', () => {
    render(<OfferUi amount={80} originalPrice={120} expiresAt={futureDate} status="pending" />);
    expect(screen.getByText('$80')).toBeInTheDocument();
    expect(screen.getByText('$120')).toBeInTheDocument();
  });

  it('renders the countdown expiry label', () => {
    render(<OfferUi amount={80} originalPrice={120} expiresAt={futureDate} status="pending" />);
    expect(screen.getByText('Expires in')).toBeInTheDocument();
  });

  it('fires onDecline, onCounter, and onAccept callbacks', () => {
    const onDecline = vi.fn();
    const onCounter = vi.fn();
    const onAccept = vi.fn();
    render(
      <OfferUi
        amount={80}
        originalPrice={120}
        expiresAt={futureDate}
        status="pending"
        onDecline={onDecline}
        onCounter={onCounter}
        onAccept={onAccept}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(onDecline).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /counter/i }));
    expect(onCounter).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons when callbacks are not provided', () => {
    render(<OfferUi amount={80} originalPrice={120} expiresAt={futureDate} status="pending" />);
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /counter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
  });
});

describe('OfferUi — floor-warning status', () => {
  it('renders the minimum offer floor amount', () => {
    render(
      <OfferUi
        amount={50}
        originalPrice={120}
        expiresAt={futureDate}
        status="floor-warning"
        floorAmount={84}
      />,
    );
    expect(screen.getByText(/minimum offer is \$84/i)).toBeInTheDocument();
  });

  it('renders em dash when floorAmount is not provided', () => {
    render(
      <OfferUi amount={50} originalPrice={120} expiresAt={futureDate} status="floor-warning" />,
    );
    expect(screen.getByText(/minimum offer is —/i)).toBeInTheDocument();
  });

  it('renders the offer amount and original price', () => {
    render(
      <OfferUi
        amount={50}
        originalPrice={120}
        expiresAt={futureDate}
        status="floor-warning"
        floorAmount={84}
      />,
    );
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('$120')).toBeInTheDocument();
  });
});

describe('OfferUi — accepted status', () => {
  it('renders Offer Accepted with the amount', () => {
    render(<OfferUi amount={80} originalPrice={120} expiresAt={futureDate} status="accepted" />);
    expect(screen.getByText(/offer accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/\$80/)).toBeInTheDocument();
  });

  it('renders checkout CTA and fires onCheckout', () => {
    const onCheckout = vi.fn();
    render(
      <OfferUi
        amount={80}
        originalPrice={120}
        expiresAt={futureDate}
        status="accepted"
        onCheckout={onCheckout}
      />,
    );
    const btn = screen.getByRole('button', { name: /checkout now/i });
    fireEvent.click(btn);
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it('does not render checkout button when onCheckout is not provided', () => {
    render(<OfferUi amount={80} originalPrice={120} expiresAt={futureDate} status="accepted" />);
    expect(screen.queryByRole('button', { name: /checkout now/i })).not.toBeInTheDocument();
  });
});

describe('OfferUi — countdown timer', () => {
  it('shows Expired when expiresAt is in the past', () => {
    const pastDate = new Date(Date.now() - 1000);
    render(<OfferUi amount={80} originalPrice={120} expiresAt={pastDate} status="pending" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('updates countdown after 1 second via setInterval', () => {
    // Use a date exactly 65 seconds in the future so initial render shows "1m Xs"
    const expiresAt = new Date(Date.now() + 65_000);
    render(<OfferUi amount={80} originalPrice={120} expiresAt={expiresAt} status="pending" />);
    // Advance timer by 5 seconds — countdown should decrease
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    // After 5s from 65s remaining we have 60s = "1m 0s"
    expect(screen.getByText(/1m/)).toBeInTheDocument();
  });
});
