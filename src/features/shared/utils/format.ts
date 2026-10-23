export function formatPrice(cents: number): string {
  const safeCents = Math.round(cents);
  const negative = safeCents < 0;
  const absCents = Math.abs(safeCents);
  const dollars = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  const formatted = `$${dollars}.${String(remainder).padStart(2, '0')}`;
  return negative ? `-${formatted}` : formatted;
}

export function calculateFee(priceCents: number): number {
  if (priceCents <= 0) return 0;
  if (priceCents < 1500) return 99;
  return Math.round(priceCents * 0.06);
}

export function calculateNet(priceCents: number): number {
  if (priceCents <= 0) return 0;
  return priceCents - calculateFee(priceCents);
}
