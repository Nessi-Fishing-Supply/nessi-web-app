export const OFFER_MIN_PERCENTAGE = 0.7;
export const OFFER_EXPIRY_HOURS = 24;
export const OFFER_CHECKOUT_WINDOW_HOURS = 4;
export const OFFER_DEFAULT_PREFILL_PERCENTAGE = 0.8;

export function validateOfferAmount(
  amountCents: number,
  listingPriceCents: number,
): { valid: boolean; error?: string } {
  if (amountCents <= 0) {
    return { valid: false, error: 'Offer amount must be greater than zero' };
  }

  const minCents = Math.ceil(listingPriceCents * OFFER_MIN_PERCENTAGE);
  if (amountCents < minCents) {
    return { valid: false, error: 'Offer must be at least 70% of the listing price' };
  }

  return { valid: true };
}

export function calculateMinOffer(listingPriceCents: number): number {
  return Math.ceil(listingPriceCents * OFFER_MIN_PERCENTAGE);
}

export function calculateDefaultOffer(listingPriceCents: number): number {
  return Math.ceil(listingPriceCents * OFFER_DEFAULT_PREFILL_PERCENTAGE);
}

export function isOfferExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
