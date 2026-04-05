import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';
import { formatPrice } from '@/features/shared/utils/format';

interface OrderReleasedParams {
  sellerFirstName: string;
  listingTitle: string;
  amountCents: number;
  orderId: string;
}

export function orderReleased({
  sellerFirstName,
  listingTitle,
  amountCents,
  orderId,
}: OrderReleasedParams): EmailTemplate {
  const safeName = escapeHtml(sellerFirstName);
  const safeTitle = escapeHtml(listingTitle);
  const amount = formatPrice(amountCents);
  const salesUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/sales`;

  const body = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">Funds released to your account</h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${safeName}, the buyer has confirmed receipt of <strong>${safeTitle}</strong>.
    </p>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      Funds of <strong style="color: #16a34a;">${amount}</strong> have been released to your account.
    </p>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${salesUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            View Sale
          </a>
        </td>
      </tr>
    </table>
    <!-- Fallback link -->
    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${salesUrl}" style="color: #2563eb; word-break: break-all;">${salesUrl}</a>
    </p>
  `;

  return {
    subject: `Funds released — ${safeTitle}`,
    html: emailLayout(body),
  };
}
