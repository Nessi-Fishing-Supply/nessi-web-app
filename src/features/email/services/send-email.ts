import { getResendClient, getFromEmail } from './client';
import type { SendEmailParams } from '../types';

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  return getResendClient().emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
  });
}
