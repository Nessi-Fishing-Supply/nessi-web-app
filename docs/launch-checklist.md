# Launch Checklist

Items to address before Nessi goes to production. Organized by priority.

---

## Critical (must-have for launch)

- [x] **Environment variables** — ~~Vercel env vars split per environment.~~ Done 2026-03-19. `NEXT_PUBLIC_APP_URL`: production=`https://nessifishingsupply.com`, preview=`https://nessifishingsupply.com`, development=`http://localhost:3000`. Supabase vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) added to all environments.
- [x] **Production URLs in Supabase** — ~~Update Site URL and redirect allowlist.~~ Done 2026-03-19. Site URL set to `https://nessifishingsupply.com`. Redirect allowlist: `https://nessifishingsupply.com/api/auth/callback`, `http://localhost:3000/api/auth/callback`.
- [x] **Resend custom domain + Supabase SMTP** — ~~Verify custom sending domain and configure SMTP.~~ Done 2026-03-19. Resend domain verified for `nessifishingsupply.com`. Supabase Custom SMTP configured with Resend (`smtp.resend.com:465`).

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

## Post-Launch Infrastructure

- [ ] **Supabase branching** — Create dev/preview branches for database isolation. Branches auto-provision per git branch, giving each Vercel preview deploy its own database. ~$10/month per active branch. Requires Pro plan ($25/month). Valuable once there's a team or real user data to protect from dev testing.

## Nice to Have (post-launch is fine)

- [ ] **Social SSO (Google, Apple, Facebook)** — OAuth login via Supabase social providers. Requires Apple Developer account, Google Cloud Console, and Facebook App setup. Post-auth routing: first login → onboarding, returning → previous page.
- [ ] **Email change flow** — Allow users to update their email address from account settings with re-verification.
- [ ] **Account deletion** — Self-service account deletion with confirmation flow. Backend cascade is already in place: `auth.users` DELETE → profiles CASCADE → `handle_profile_deletion()` trigger cleans up `avatars` and `product-images` storage. As new user-owned tables are added (listings, orders, messages, reviews), ensure each has `ON DELETE CASCADE` FK and storage cleanup in the trigger.
- [ ] **Session management** — Show active sessions, allow users to revoke sessions on other devices.
