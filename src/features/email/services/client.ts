import 'server-only';

import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export function getFromEmail(): string {
  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error('Missing RESEND_FROM_EMAIL environment variable');
  }
  return process.env.RESEND_FROM_EMAIL;
}
