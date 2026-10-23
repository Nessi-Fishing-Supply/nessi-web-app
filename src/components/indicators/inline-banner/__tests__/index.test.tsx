/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import InlineBanner from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('InlineBanner', () => {
  it('renders the title', () => {
    render(<InlineBanner variant="info" title="Your listing is under review" />);
    expect(screen.getByText('Your listing is under review')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <InlineBanner
        variant="warning"
        title="Action required"
        description="Please verify your email address."
      />,
    );
    expect(screen.getByText('Please verify your email address.')).toBeInTheDocument();
  });

  it('uses role="alert" for error and warning variants', () => {
    const { rerender } = render(<InlineBanner variant="error" title="Payment failed" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<InlineBanner variant="warning" title="Low stock" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses role="status" for info and success variants', () => {
    const { rerender } = render(<InlineBanner variant="info" title="Processing" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<InlineBanner variant="success" title="Saved!" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls action.onClick when the action button is clicked', () => {
    const onClick = vi.fn();
    render(
      <InlineBanner variant="error" title="Payment failed" action={{ label: 'Retry', onClick }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when action is not provided', () => {
    render(<InlineBanner variant="success" title="Saved!" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
