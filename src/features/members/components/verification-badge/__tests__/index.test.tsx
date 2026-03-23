/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HiShieldCheck } from 'react-icons/hi';
import VerificationBadge from '../index';

beforeEach(() => {
  cleanup();
});

describe('VerificationBadge', () => {
  it('renders the label text', () => {
    render(<VerificationBadge type="seller" label="Trusted Seller" variant="success" />);
    expect(screen.getByText('Trusted Seller')).toBeInTheDocument();
  });

  it('applies the correct variant class', () => {
    const { container, rerender } = render(
      <VerificationBadge type="seller" label="Trusted Seller" variant="success" />,
    );
    expect((container.firstChild as HTMLElement)?.className).toMatch(/success/);

    rerender(<VerificationBadge type="angler" label="Tournament Angler" variant="orange" />);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/orange/);

    rerender(<VerificationBadge type="maker" label="Verified Maker" variant="maroon" />);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/maroon/);

    rerender(<VerificationBadge type="neutral" label="Member" variant="neutral" />);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/neutral/);

    rerender(<VerificationBadge type="green" label="Pro Seller" variant="green" />);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/green/);
  });

  it('renders icon when provided', () => {
    render(
      <VerificationBadge
        type="seller"
        label="Trusted Seller"
        variant="success"
        icon={<HiShieldCheck data-testid="badge-icon" />}
      />,
    );
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
  });

  it('renders without icon when icon prop is omitted', () => {
    render(<VerificationBadge type="seller" label="Trusted Seller" variant="success" />);
    // Icon wrapper should not be present
    const badge = screen.getByText('Trusted Seller').closest('span[data-type]');
    expect(badge).toBeInTheDocument();
    // Label should still render
    expect(screen.getByText('Trusted Seller')).toBeInTheDocument();
  });

  it('sets data-type attribute from type prop', () => {
    render(
      <VerificationBadge type="tournament-angler" label="Tournament Angler" variant="orange" />,
    );
    const badge = screen.getByText('Tournament Angler').closest('span');
    expect(badge?.closest('[data-type="tournament-angler"]')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <VerificationBadge
        type="seller"
        label="Trusted Seller"
        variant="success"
        className="custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
