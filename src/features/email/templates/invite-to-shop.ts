import type { EmailTemplate } from '../types';
import { escapeHtml } from './utils';
import { emailLayout } from './layout';

interface InviteToShopParams {
  shopName: string;
  inviterName: string;
  roleName: string;
  token: string;
}

export function inviteToShop({
  shopName,
  inviterName,
  roleName,
  token,
}: InviteToShopParams): EmailTemplate {
  const safeShopName = escapeHtml(shopName);
  const safeInviterName = escapeHtml(inviterName);
  const safeRoleName = escapeHtml(roleName);
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  const body = `
    <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.5;">Hi there,</p>
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong style="color: #111827;">${safeInviterName}</strong> has invited you to join
      <strong style="color: #111827;">${safeShopName}</strong> as a
      <strong style="color: #111827;">${safeRoleName}</strong> on Nessi.
    </p>
    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${acceptUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; background-color: #2563eb;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    <!-- Fallback link -->
    <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px; line-height: 1.5;">
      If the button above doesn't work, copy and paste this link into your browser:<br />
      <a href="${acceptUrl}" style="color: #2563eb; word-break: break-all;">${acceptUrl}</a>
    </p>
    <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `;

  return {
    subject: `You've been invited to join ${safeShopName} on Nessi`,
    html: emailLayout(body),
  };
}
