/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import OfferBubble from '../index';

const defaultProps = {
  amount: 5000,
  originalPrice: 10000,
  expiresAt: new Date(Date.now() + 86400000),
  status: 'pending' as const,
};

beforeEach(() => {
  vi.useFakeTimers();
  cleanup();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OfferBubble aria-busy propagation', () => {
  it('sets aria-busy="true" on all action buttons when isPending is true', () => {
    render(
      <OfferBubble
        {...defaultProps}
        onAccept={vi.fn()}
        onCounter={vi.fn()}
        onDecline={vi.fn()}
        isPending={true}
      />,
    );
    expect(screen.getByRole('button', { name: 'Accept' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Counter' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Decline offer' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('sets aria-busy="false" on all action buttons when isPending is false', () => {
    render(
      <OfferBubble
        {...defaultProps}
        onAccept={vi.fn()}
        onCounter={vi.fn()}
        onDecline={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Accept' })).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('button', { name: 'Counter' })).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('button', { name: 'Decline offer' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
  });

  it('does not render action buttons when status is not pending', () => {
    render(
      <OfferBubble
        {...defaultProps}
        status="accepted"
        onAccept={vi.fn()}
        onCounter={vi.fn()}
        onDecline={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline offer' })).not.toBeInTheDocument();
  });

  it('does not render action buttons when callbacks are not provided', () => {
    render(<OfferBubble {...defaultProps} />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Counter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline offer' })).not.toBeInTheDocument();
  });
});
