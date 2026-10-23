/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorState from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('ErrorState', () => {
  describe('inline variant', () => {
    it('renders the message text', () => {
      render(<ErrorState variant="inline" message="Invalid email address" />);
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('has role="alert" with aria-live="assertive"', () => {
      render(<ErrorState variant="inline" message="Required field" />);
      const el = screen.getByRole('alert');
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('banner variant', () => {
    it('renders title and description', () => {
      render(
        <ErrorState
          variant="banner"
          message="Payment failed"
          description="Please check your card details."
        />,
      );
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
      expect(screen.getByText('Please check your card details.')).toBeInTheDocument();
    });

    it('calls action.onClick when action button is clicked', () => {
      const onClick = vi.fn();
      render(
        <ErrorState
          variant="banner"
          message="Something went wrong"
          action={{ label: 'Try again', onClick }}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('404 variant', () => {
    it('renders the fixed headline "The one that got away."', () => {
      render(<ErrorState variant="404" message="That page doesn't exist." />);
      expect(screen.getByText('The one that got away.')).toBeInTheDocument();
    });

    it('renders the message below the headline', () => {
      render(<ErrorState variant="404" message="That page doesn't exist." />);
      expect(screen.getByText("That page doesn't exist.")).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
      const onClick = vi.fn();
      render(
        <ErrorState
          variant="404"
          message="Page not found"
          action={{ label: 'Go home', onClick }}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
