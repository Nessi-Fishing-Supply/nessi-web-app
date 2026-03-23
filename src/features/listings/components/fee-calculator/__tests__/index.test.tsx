/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import FeeCalculator from '../index';

beforeEach(() => {
  cleanup();
});

describe('FeeCalculator', () => {
  it('displays listing price formatted correctly', () => {
    render(<FeeCalculator price={5000} feeRate={0.06} />);
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('calculates fee from price * feeRate and shows net payout', () => {
    // price=10000 cents ($100), feeRate=0.06 → fee=600 ($6.00), net=9400 ($94.00)
    render(<FeeCalculator price={10000} feeRate={0.06} />);
    expect(screen.getByText('−$6.00')).toBeInTheDocument();
    expect(screen.getByText('$94.00')).toBeInTheDocument();
  });

  it('shows fee rate percentage in hint', () => {
    render(<FeeCalculator price={5000} feeRate={0.08} />);
    expect(screen.getByText('(8%)')).toBeInTheDocument();
  });

  it('renders shop discount banner when isShop is true', () => {
    render(<FeeCalculator price={5000} feeRate={0.05} isShop />);
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByText(/reduced fee rate/i)).toBeInTheDocument();
  });

  it('does not render shop banner when isShop is false', () => {
    render(<FeeCalculator price={5000} feeRate={0.06} isShop={false} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
