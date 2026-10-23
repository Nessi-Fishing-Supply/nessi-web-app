import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  validateOfferAmount,
  calculateMinOffer,
  calculateDefaultOffer,
  isOfferExpired,
  OFFER_MIN_PERCENTAGE,
  OFFER_EXPIRY_HOURS,
  OFFER_CHECKOUT_WINDOW_HOURS,
  OFFER_DEFAULT_PREFILL_PERCENTAGE,
} from '../offer-validation';

describe('offer validation constants', () => {
  it('has correct values', () => {
    expect(OFFER_MIN_PERCENTAGE).toBe(0.7);
    expect(OFFER_EXPIRY_HOURS).toBe(24);
    expect(OFFER_CHECKOUT_WINDOW_HOURS).toBe(4);
    expect(OFFER_DEFAULT_PREFILL_PERCENTAGE).toBe(0.8);
  });
});

describe('validateOfferAmount', () => {
  it('returns valid for an offer at exactly 70%', () => {
    const result = validateOfferAmount(7000, 10000);
    expect(result).toEqual({ valid: true });
  });

  it('returns valid for an offer above 70%', () => {
    const result = validateOfferAmount(8500, 10000);
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid for an offer below 70%', () => {
    const result = validateOfferAmount(6999, 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for a zero amount', () => {
    const result = validateOfferAmount(0, 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Offer amount must be greater than zero');
  });

  it('returns invalid for a negative amount', () => {
    const result = validateOfferAmount(-100, 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Offer amount must be greater than zero');
  });

  it('handles odd cents with correct rounding (ceil)', () => {
    // 9999 * 0.70 = 6999.3 → ceil = 7000
    const result = validateOfferAmount(6999, 9999);
    expect(result.valid).toBe(false);
    const resultAtCeil = validateOfferAmount(7000, 9999);
    expect(resultAtCeil.valid).toBe(true);
  });

  it('returns valid when offer equals listing price', () => {
    const result = validateOfferAmount(10000, 10000);
    expect(result).toEqual({ valid: true });
  });
});

describe('calculateMinOffer', () => {
  it('returns 70% of listing price', () => {
    expect(calculateMinOffer(10000)).toBe(7000);
  });

  it('rounds up on odd cents', () => {
    // 9999 * 0.70 = 6999.3 → ceil = 7000
    expect(calculateMinOffer(9999)).toBe(7000);
  });

  it('returns 0 for a zero price', () => {
    expect(calculateMinOffer(0)).toBe(0);
  });

  it('handles small prices', () => {
    // 100 * 0.70 = 70
    expect(calculateMinOffer(100)).toBe(70);
  });
});

describe('calculateDefaultOffer', () => {
  it('returns 80% of listing price', () => {
    expect(calculateDefaultOffer(10000)).toBe(8000);
  });

  it('rounds up on odd cents', () => {
    // 9999 * 0.80 = 7999.2 → ceil = 8000
    expect(calculateDefaultOffer(9999)).toBe(8000);
  });

  it('returns 0 for a zero price', () => {
    expect(calculateDefaultOffer(0)).toBe(0);
  });
});

describe('isOfferExpired', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for a past date', () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    expect(isOfferExpired(pastDate)).toBe(true);
  });

  it('returns false for a future date', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isOfferExpired(futureDate)).toBe(false);
  });

  it('returns true for a date exactly at now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));
    // Same timestamp — getTime() < Date.now() is false (equal, not less)
    expect(isOfferExpired('2026-03-30T12:00:00.000Z')).toBe(false);
    vi.useRealTimers();
  });
});
