import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';

interface OwnershipTransferRequestParams {
  shopName: string;
  ownerName: string;
  token: string;
}

export function ownershipTransferRequest({
  shopName,
  ownerName,
  token,
}: OwnershipTransferRequestParams): EmailTemplate {
  const safeShopName = escapeHtml(shopName);
  const safeOwnerName = escapeHtml(ownerName);
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shop/transfer/${token}`;

  const body = `
    <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.5;">Hi there,</p>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong style="color: #111827;">${safeOwnerName}</strong> wants to transfer ownership of
      <strong style="color: #111827;">${safeShopName}</strong> to you on Nessi.
    </p>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${acceptUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            Accept Ownership Transfer
          </a>
        </td>
      </tr>
    </table>
    <!-- Fallback link -->
    <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px; line-height: 1.5;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${acceptUrl}" style="color: #2563eb; word-break: break-all;">${acceptUrl}</a>
    </p>
    <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px; line-height: 1.5;">
      This link expires in 7 days.
    </p>
    <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      If you didn't expect this request, you can safely ignore this email.
    </p>
  `;

  return {
    subject: `Ownership transfer request for ${safeShopName} on Nessi`,
    html: emailLayout(body),
  };
}
