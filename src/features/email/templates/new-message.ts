import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';

interface NewMessageParams {
  senderName: string;
  messagePreview: string;
  threadId: string;
  shopName?: string;
}

export function newMessage({
  senderName,
  messagePreview,
  threadId,
  shopName,
}: NewMessageParams): EmailTemplate {
  const safeSender = escapeHtml(senderName);
  const safeShopName = shopName ? escapeHtml(shopName) : null;
  const rawPreview =
    messagePreview.length > 200 ? messagePreview.slice(0, 200) + '...' : messagePreview;
  const safePreview = escapeHtml(rawPreview);
  const threadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/messages/${threadId}`;

  const subjectLine = safeShopName
    ? `New message for ${safeShopName} from ${safeSender}`
    : `New message from ${safeSender}`;

  const shopContext = safeShopName
    ? `<p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.5;">Message received by <strong>${safeShopName}</strong></p>`
    : '';

  const body = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">New message from ${safeSender}</h2>
    ${shopContext}
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      ${safePreview}
    </p>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${threadUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            View Message
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
    subject: subjectLine,
    html: emailLayout(body),
  };
}
