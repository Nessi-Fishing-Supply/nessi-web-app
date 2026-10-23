import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';

interface OrderDisputedParams {
  recipientFirstName: string;
  listingTitle: string;
  orderId: string;
  role: 'buyer' | 'seller';
}

export function orderDisputed({
  recipientFirstName,
  listingTitle,
  orderId,
  role,
}: OrderDisputedParams): EmailTemplate {
  const safeName = escapeHtml(recipientFirstName);
  const safeTitle = escapeHtml(listingTitle);
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${orderId}`;

  const bodyMessage =
    role === 'buyer'
      ? `A dispute has been filed on your order for <strong>${safeTitle}</strong>. Our team will review the details and reach out with next steps.`
      : `A dispute has been filed by the buyer on your sale of <strong>${safeTitle}</strong>. Our team will review the details and reach out with next steps.`;

  const body = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">A dispute has been filed</h2>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${safeName}, ${bodyMessage}
    </p>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${orderUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            View Order
          </a>
        </td>
      </tr>
    </table>
    <!-- Fallback link -->
    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${orderUrl}" style="color: #2563eb; word-break: break-all;">${orderUrl}</a>
    </p>
  `;

  return {
    subject: `A dispute has been filed — ${safeTitle}`,
    html: emailLayout(body),
  };
}
