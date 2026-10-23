import type { Carrier } from '@/features/orders/types/order';

export function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const encoded = encodeURIComponent(trackingNumber);

  switch (carrier as Carrier) {
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${encoded}`;
    case 'FedEx':
      return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
    case 'DHL':
    case 'Other':
    default:
      return null;
  }
}
