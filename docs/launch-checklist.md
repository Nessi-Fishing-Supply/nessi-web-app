# Launch Checklist

Items to address before Nessi goes to production. Organized by priority.

---

## Critical (must-have for launch)

- [ ] **Production URLs in Supabase** — Update Site URL from `http://localhost:3000` to production domain. Update redirect URLs in Authentication > URL Configuration.
- [ ] **Environment variables** — Ensure `NEXT_PUBLIC_APP_URL` is set to production domain in Vercel env vars.
- [ ] **Resend custom domain** — Verify a custom sending domain in Resend (e.g., `nessi.com`) so auth emails don't come from `onboarding@resend.dev`. Improves deliverability and trust.

## High Priority (should-have for launch)

- [ ] **Branded email templates** — Replace Supabase default auth email templates with branded versions using React Email + Resend. Covers: signup verification, password reset, email change confirmation.
- [ ] **Transactional email layer** — Resend + React Email for non-auth emails: order confirmations, shipping notifications, seller alerts, buyer messages.
- [ ] **Error monitoring** — Sentry (free tier: 5K errors/month) for error aggregation, deduplication, alerting. Install with `npx @sentry/wizard@latest -i nextjs`. Purely additive.
- [ ] **Rate limiting** — Application-level rate limiting on API routes (product creation, image uploads, auth register). Vercel WAF handles DDoS at the infrastructure level.

## Nice to Have (post-launch is fine)

- [ ] **Email change flow** — Allow users to update their email address from account settings with re-verification.
- [ ] **Account deletion** — Self-service account deletion with confirmation flow.
- [ ] **Session management** — Show active sessions, allow users to revoke sessions on other devices.
