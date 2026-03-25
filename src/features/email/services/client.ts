import 'server-only';

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error('Missing RESEND_FROM_EMAIL environment variable');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
export const fromEmail = process.env.RESEND_FROM_EMAIL;
