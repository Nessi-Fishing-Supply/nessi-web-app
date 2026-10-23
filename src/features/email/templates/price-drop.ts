import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';
import { formatPrice } from '@/features/shared/utils/format';

interface PriceDropParams {
  listingTitle: string;
  oldPriceCents: number;
  newPriceCents: number;
  listingId: string;
}

export function priceDrop({
  listingTitle,
  oldPriceCents,
  newPriceCents,
  listingId,
}: PriceDropParams): EmailTemplate {
  const safeTitle = escapeHtml(listingTitle);
  const oldPrice = formatPrice(oldPriceCents);
  const newPrice = formatPrice(newPriceCents);
  const listingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/listing/${listingId}`;

  const body = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">${safeTitle}</h2>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      Good news — this listing just dropped in price!
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="padding-right: 16px; color: #9ca3af; font-size: 18px; text-decoration: line-through;">
          ${oldPrice}
        </td>
        <td style="color: #16a34a; font-size: 24px; font-weight: 700;">
          ${newPrice}
        </td>
      </tr>
    </table>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${listingUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            View Listing
          </a>
        </td>
      </tr>
    </table>
    <!-- Fallback link -->
    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${listingUrl}" style="color: #2563eb; word-break: break-all;">${listingUrl}</a>
    </p>
  `;

  return {
    subject: `${safeTitle} just dropped in price!`,
    html: emailLayout(body),
  };
}
