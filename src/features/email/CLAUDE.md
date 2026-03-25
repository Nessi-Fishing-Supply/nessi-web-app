# Email Feature Domain

Transactional email for Nessi via [Resend](https://resend.com).

## Architecture

```
email/
├── services/
│   ├── client.ts          ← Singleton Resend client + env validation (server-only)
│   └── send-email.ts      ← Generic sendEmail({ to, subject, html }) → { data, error }
├── templates/
│   ├── layout.ts          ← Branded Nessi shell (header/footer) — all templates use this
│   ├── utils.ts           ← escapeHtml() for safe interpolation
│   └── invite-to-shop.ts  ← Shop invitation email template
└── types/
    └── index.ts           ← EmailTemplate, SendEmailParams
```

## Adding a New Email Template

1. Create `src/features/email/templates/{template-name}.ts`
2. Define a typed params interface for the template's data
3. Export a function that returns `EmailTemplate` (`{ subject, html }`)
4. Use `emailLayout(body)` from `layout.ts` to wrap the body in the branded shell
5. Use `escapeHtml()` from `utils.ts` on any user-provided strings interpolated into HTML
6. The caller imports `sendEmail` from `services/send-email.ts` and the template function separately

## Usage Pattern

```ts
import { sendEmail } from '@/features/email/services/send-email';
import { inviteToShop } from '@/features/email/templates/invite-to-shop';

const { subject, html } = inviteToShop({ shopName, inviterName, roleName, token });
const { data, error } = await sendEmail({ to: recipientEmail, subject, html });
```

## Key Decisions

- **No `@react-email/components`** — templates are plain HTML template literals with inline CSS for maximum email client compatibility
- **Table-based layout** — required for consistent rendering across email clients (Outlook, Gmail, Apple Mail)
- **All styles inline** — no `<style>` blocks, no external stylesheets
- **`server-only` guard** — `client.ts` imports `server-only` to prevent client-side usage
- **Env vars** — `RESEND_API_KEY` and `RESEND_FROM_EMAIL` validated at module load with runtime checks

## Environment Variables

| Variable            | Purpose                                                         | Public |
| ------------------- | --------------------------------------------------------------- | ------ |
| `RESEND_API_KEY`    | Resend API authentication                                       | No     |
| `RESEND_FROM_EMAIL` | Sender address (e.g., `Nessi <noreply@nessifishingsupply.com>`) | No     |
