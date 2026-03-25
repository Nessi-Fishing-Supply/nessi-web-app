# User Journey Maps

Visual flow diagrams for every persona and critical path in Nessi. Maintained alongside feature development — conductor tickets should update relevant journeys when flows change.

Renders natively in GitHub and VS Code (Markdown Preview).

## Personas

| Persona     | File                             | Description                                               |
| ----------- | -------------------------------- | --------------------------------------------------------- |
| Guest       | [guest.md](guest.md)             | Unauthenticated browsing, search, guest cart              |
| Auth        | [auth.md](auth.md)               | Signup, login, OTP, password reset, email change          |
| Onboarding  | [onboarding.md](onboarding.md)   | Buyer vs seller path, post-onboarding opt-in              |
| Buyer       | [buyer.md](buyer.md)             | Search, filter, cart, recently viewed, checkout           |
| Seller      | [seller.md](seller.md)           | Listing lifecycle: create, edit, publish, sold, archive   |
| Shop Owner  | [shop-owner.md](shop-owner.md)   | Create shop, settings, members, ownership, deletion       |
| Shop Member | [shop-member.md](shop-member.md) | Role-based access: owner, manager, contributor            |
| Account     | [account.md](account.md)         | Profile edit, seller toggle, email change, delete account |
| Context     | [context.md](context.md)         | Member/shop identity switching, revocation                |

## Coverage Tracker

Status: Built = flow exists in code | Tested = has Playwright/Vitest coverage | Gap = not built yet

### Guest Flows

- [x] Built | [ ] Tested — Browse listings (homepage, category, infinite scroll)
- [x] Built | [ ] Tested — Search (FTS + trigram fallback, filters, autocomplete)
- [x] Built | [ ] Tested — View listing detail
- [x] Built | [ ] Tested — View public member profile
- [x] Built | [ ] Tested — View public shop page
- [x] Built | [ ] Tested — Guest cart (localStorage, add/remove/clear)
- [x] Built | [ ] Tested — Guest recently viewed (localStorage)

### Auth Flows

- [x] Built | [ ] Tested — Signup (email + password + OTP verification)
- [x] Built | [ ] Tested — Login (email + password)
- [x] Built | [ ] Tested — Login with unverified email (resend flow)
- [x] Built | [ ] Tested — Password reset (email + OTP + new password)
- [x] Built | [ ] Tested — Logout
- [ ] Built | [ ] Tested — OAuth (Google, etc.) — not implemented

### Onboarding Flows

- [x] Built | [ ] Tested — Buyer path (4 steps)
- [x] Built | [ ] Tested — Seller path (5 steps, includes seller type)
- [x] Built | [ ] Tested — Post-onboarding seller opt-in modal

### Buyer Flows

- [x] Built | [ ] Tested — Search with filters (category, condition, price, state, species)
- [x] Built | [ ] Tested — Autocomplete suggestions
- [x] Built | [ ] Tested — Add to cart (auth: DB, guest: localStorage)
- [x] Built | [ ] Tested — Cart merge on login (guest -> DB)
- [x] Built | [ ] Tested — Cart validation (price changes, removed listings)
- [x] Built | [ ] Tested — Cart expiry refresh (30-day TTL)
- [x] Built | [ ] Tested — Recently viewed (dual-source: DB + localStorage)
- [x] Built | [ ] Tested — Recently viewed merge on login
- [ ] Built | [ ] Tested — Checkout — not implemented
- [ ] Built | [ ] Tested — Order history — not implemented
- [ ] Built | [ ] Tested — Favorites/saved listings — not implemented

### Seller Flows

- [x] Built | [ ] Tested — Create draft listing
- [x] Built | [ ] Tested — 5-step create wizard (photos, category, details, pricing, review)
- [x] Built | [ ] Tested — Upload listing photos (Sharp processing, 2+ required)
- [x] Built | [ ] Tested — Publish listing (draft -> active)
- [x] Built | [ ] Tested — Edit listing (5-step edit wizard, partial save)
- [x] Built | [ ] Tested — Mark sold (active -> sold)
- [x] Built | [ ] Tested — Archive listing (active -> archived)
- [x] Built | [ ] Tested — Unarchive listing (archived -> active)
- [x] Built | [ ] Tested — Duplicate listing (creates new draft)
- [x] Built | [ ] Tested — Delete draft (hard delete)
- [x] Built | [ ] Tested — Quick edit price (inline from dashboard)
- [x] Built | [ ] Tested — View count tracking

### Shop Owner Flows

- [x] Built | [ ] Tested — Create shop (auto-slug, owner assigned)
- [x] Built | [ ] Tested — Edit shop details (name, slug, description)
- [x] Built | [ ] Tested — Upload shop avatar
- [x] Built | [ ] Tested — Upload hero banner
- [x] Built | [ ] Tested — Invite shop member with role
- [x] Built | [ ] Tested — Remove shop member
- [x] Built | [ ] Tested — Transfer ownership
- [x] Built | [ ] Tested — Delete shop (type-to-confirm, storage cleanup)

### Shop Member Flows

- [x] Built | [ ] Tested — View shops user belongs to
- [x] Built | [ ] Tested — Context switch to shop identity
- [x] Built | [ ] Tested — Context revocation on 403 (auto-switch back)
- [ ] Built | [ ] Tested — Role-based permission enforcement in UI
- [ ] Built | [ ] Tested — Role-based permission enforcement in API

### Account Management

- [x] Built | [ ] Tested — Edit display name
- [x] Built | [ ] Tested — Edit bio
- [x] Built | [ ] Tested — Upload/change avatar
- [x] Built | [ ] Tested — Edit fishing identity (species, technique, state)
- [x] Built | [ ] Tested — Toggle seller status (with precondition check)
- [x] Built | [ ] Tested — Change email (+ OTP verification)
- [x] Built | [ ] Tested — Delete account (shop ownership gate, storage cleanup, cascade)
- [x] Built | [ ] Tested — Notification preferences
