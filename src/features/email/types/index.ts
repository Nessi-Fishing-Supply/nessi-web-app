export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}
