# Stripe Module

Thin wrapper around the Stripe Node.js SDK. Lives in `src/libs/stripe/` — shared infrastructure, not a feature domain.

## Module Boundary

`src/libs/stripe/` must **not** import from `src/features/`. It is server-only and consumed by API routes in `src/app/api/`. Never import this module from client components or any file without a server context.

## API

### `getStripe(): Stripe`

Lazy-initialized Stripe instance. The client is created on first call and reused for all subsequent calls (module-level singleton). Safe to call at request time — does not run at Next.js build time.

No abstraction is provided over the Stripe SDK. Callers use the returned `Stripe` instance directly via the official SDK API.

## Environment Variables

| Variable                | Scope       | Description                                                                                    |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Server only | Stripe secret key (`sk_test_*` in dev, `sk_live_*` in prod)                                    |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret (`whsec_*`) — used in webhook handler to verify event signatures |

`STRIPE_SECRET_KEY` is required at runtime. `STRIPE_WEBHOOK_SECRET` is required in the webhook handler (`src/app/api/stripe/webhook/route.ts`).

## Usage

```ts
import { getStripe } from '@/libs/stripe/client';

const stripe = getStripe();
const account = await stripe.accounts.create({ type: 'express' });
```

## Notes

- This is a thin wrapper. There is no abstraction layer over the Stripe SDK — call `stripe.*` methods directly.
- The lazy singleton pattern avoids instantiating the client during Next.js build-time static analysis, which would throw if `STRIPE_SECRET_KEY` is absent in the build environment.
