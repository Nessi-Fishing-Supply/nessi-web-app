import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';
import { formatPrice } from '@/features/shared/utils/format';

export type OfferEventType = 'received' | 'accepted' | 'declined' | 'countered' | 'expiring';

interface OfferNotificationParams {
  type: OfferEventType;
  listingTitle: string;
  amount: number;
  senderName: string;
  threadId: string;
}

const subjects: Record<OfferEventType, (title: string) => string> = {
  received: (title) => `New offer on ${title}`,
  accepted: (title) => `Your offer on ${title} was accepted!`,
  declined: (title) => `Your offer on ${title} was declined`,
  countered: (title) => `Counter offer on ${title}`,
  expiring: (title) => `Your offer on ${title} expires soon`,
};

const bodyCopy: Record<OfferEventType, (sender: string, price: string, title: string) => string> = {
  received: (sender, price, title) => `${sender} made an offer of ${price} on ${title}.`,
  accepted: (sender, price, title) =>
    `Great news! Your offer of ${price} on ${title} was accepted by ${sender}.`,
  declined: (sender, price, title) => `${sender} declined your offer of ${price} on ${title}.`,
  countered: (sender, price, title) => `${sender} countered with ${price} on ${title}.`,
  expiring: (_sender, price, title) =>
    `Your offer of ${price} on ${title} expires soon. Take action before it's too late.`,
};

const ctaLabels: Record<OfferEventType, string> = {
  received: 'View Offer',
  accepted: 'Continue to Checkout',
  declined: 'View Thread',
  countered: 'View Counter Offer',
  expiring: 'View Offer',
};

export function offerNotification({
  type,
  listingTitle,
  amount,
  senderName,
  threadId,
}: OfferNotificationParams): EmailTemplate {
  const safeTitle = escapeHtml(listingTitle);
  const safeSender = escapeHtml(senderName);
  const formattedPrice = formatPrice(amount);
  const threadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/messages/${threadId}`;
  const subject = subjects[type](safeTitle);
  const copy = bodyCopy[type](safeSender, formattedPrice, safeTitle);
  const ctaLabel = ctaLabels[type];

  const body = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">${subject}</h2>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      ${copy}
    </p>
    <p style="margin: 0 0 24px; color: #16a34a; font-size: 24px; font-weight: 700;">
      ${formattedPrice}
    </p>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${threadUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            ${ctaLabel}
          </a>
        </td>
      </tr>
    </table>
    <!-- Fallback link -->
    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${threadUrl}" style="color: #2563eb; word-break: break-all;">${threadUrl}</a>
    </p>
  `;

  return {
    subject,
    html: emailLayout(body),
  };
}
