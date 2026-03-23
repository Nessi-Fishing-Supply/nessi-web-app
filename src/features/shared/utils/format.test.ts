// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { formatPrice, calculateFee, calculateNet } from './format';

describe('formatPrice', () => {
  it('formats a typical price in cents', () => {
    expect(formatPrice(2999)).toBe('$29.99');
  });

  it('formats whole dollars with zero cents', () => {
    expect(formatPrice(500)).toBe('$5.00');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats a single cent', () => {
    expect(formatPrice(1)).toBe('$0.01');
  });

  it('formats exactly one dollar', () => {
    expect(formatPrice(100)).toBe('$1.00');
  });

  it('formats a large value', () => {
    expect(formatPrice(99999)).toBe('$999.99');
  });

  it('formats negative values', () => {
    expect(formatPrice(-500)).toBe('-$5.00');
  });

  it('rounds fractional cents before formatting', () => {
    expect(formatPrice(10.6)).toBe('$0.11');
  });
});

describe('calculateFee', () => {
  it('returns flat $0.99 fee for prices under the $15 threshold', () => {
    expect(calculateFee(1000)).toBe(99);
  });

  it('returns flat $0.99 fee for prices just under the threshold', () => {
    expect(calculateFee(1499)).toBe(99);
  });

  it('returns 6% fee at the $15 threshold', () => {
    expect(calculateFee(1500)).toBe(90);
  });

  it('returns 6% fee for prices above the threshold', () => {
    expect(calculateFee(2000)).toBe(120);
  });

  it('returns 0 for zero price', () => {
    expect(calculateFee(0)).toBe(0);
  });

  it('returns 0 for negative price', () => {
    expect(calculateFee(-100)).toBe(0);
  });
});

describe('calculateNet', () => {
  it('subtracts the 6% fee for prices above the threshold', () => {
    expect(calculateNet(2000)).toBe(1880);
  });

  it('subtracts the flat fee for prices under the threshold', () => {
    expect(calculateNet(1000)).toBe(901);
  });

  it('returns 0 for zero price', () => {
    expect(calculateNet(0)).toBe(0);
  });
});
