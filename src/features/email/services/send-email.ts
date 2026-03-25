import { resend, fromEmail } from './client';
import type { SendEmailParams } from '../types';

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  return resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
}
