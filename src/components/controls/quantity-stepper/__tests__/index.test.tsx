/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuantityStepper from '../index';

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('QuantityStepper', () => {
  it('renders the current value', () => {
    render(<QuantityStepper value={3} onChange={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onChange with incremented value when + is clicked', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with decremented value when - is clicked', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables decrement button when value equals min', () => {
    render(<QuantityStepper value={1} min={1} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('disables increment button when value equals max', () => {
    render(<QuantityStepper value={5} max={5} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  it('does not call onChange when decrement is clicked at min', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} min={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has role="group" and aria-live on count', () => {
    render(<QuantityStepper value={2} onChange={vi.fn()} />);
    expect(screen.getByRole('group')).toBeInTheDocument();
    const count = screen.getByText('2');
    expect(count).toHaveAttribute('aria-live', 'polite');
  });
});
