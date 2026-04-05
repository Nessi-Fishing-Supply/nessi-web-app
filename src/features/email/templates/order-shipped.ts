import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';

interface OrderShippedParams {
  buyerFirstName: string;
  listingTitle: string;
  trackingNumber: string;
  carrier: string;
  orderId: string;
}

export function orderShipped({
  buyerFirstName,
  listingTitle,
  trackingNumber,
  carrier,
  orderId,
}: OrderShippedParams): EmailTemplate {
  const safeName = escapeHtml(buyerFirstName);
  const safeTitle = escapeHtml(listingTitle);
  const safeTracking = escapeHtml(trackingNumber);
  const safeCarrier = escapeHtml(carrier);
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${orderId}`;

  const body = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">Your order has shipped!</h2>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${safeName}, your order for <strong>${safeTitle}</strong> has been shipped and is on its way.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px; background-color: #f9fafb; border-radius: 6px; padding: 16px; width: 100%;">
      <tr>
        <td style="padding-bottom: 8px;">
          <span style="color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Carrier</span>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 16px;">
          <span style="color: #111827; font-size: 15px;">${safeCarrier}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 8px;">
          <span style="color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Tracking Number</span>
        </td>
      </tr>
      <tr>
        <td>
          <span style="color: #111827; font-size: 15px; font-family: monospace;">${safeTracking}</span>
        </td>
      </tr>
    </table>
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
    subject: `Your order has shipped — ${safeTitle}`,
    html: emailLayout(body),
  };
}
