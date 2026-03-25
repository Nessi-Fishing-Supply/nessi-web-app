import 'server-only';

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error('Missing RESEND_FROM_EMAIL environment variable');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SendInviteEmailParams {
  to: string;
  shopName: string;
  inviterName: string;
  roleName: string;
  token: string;
}

export async function sendInviteEmail({
  to,
  shopName,
  inviterName,
  roleName,
  token,
}: SendInviteEmailParams) {
  const safeShopName = escapeHtml(shopName);
  const safeInviterName = escapeHtml(inviterName);
  const safeRoleName = escapeHtml(roleName);
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You've been invited to join ${safeShopName} on Nessi</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background-color: #0f172a; padding: 24px 32px;">
                <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Nessi</span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding: 32px;">
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
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: `You've been invited to join ${safeShopName} on Nessi`,
    html,
  });
}
