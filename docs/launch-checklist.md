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

## High Priority — Auth Polish

- [x] **WCAG 2.1 AA audit** — ~~Run accessibility audit on all auth forms.~~ Done 2026-03-19. Toast, Modal, Input, Button, Checkbox, all auth forms updated.
- [x] **`autocomplete` attributes** — ~~Verify all auth form inputs have correct autocomplete hints.~~ Done 2026-03-19.
- [ ] **`?redirect=` post-login routing** — After login, redirect to the page the user was trying to access (e.g., `/dashboard/products`) instead of always going to `/dashboard`.
- [ ] **Loading/timeout behavior** — Add 8-second timeout on auth API calls with inline error "Something went wrong. Check your connection and try again." Preserve form data.

## Nice to Have (post-launch is fine)

- [ ] **Social SSO (Google, Apple, Facebook)** — OAuth login via Supabase social providers. Requires Apple Developer account, Google Cloud Console, and Facebook App setup. Post-auth routing: first login → onboarding, returning → previous page.
- [ ] **Email change flow** — Allow users to update their email address from account settings with re-verification.
- [ ] **Account deletion** — Self-service account deletion with confirmation flow.
- [ ] **Session management** — Show active sessions, allow users to revoke sessions on other devices.
