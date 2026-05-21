# OpenBilling

_Portable billing infrastructure for modern SaaS._

**Switch between Stripe and Dodo Payments without rewriting your billing logic.**

## Why I built this

To solve a problem I was having, I wanted to be able to switch between Dodo payments and Stripe without rewriting my billing logic.

## What OpenBilling is

OpenBilling is a narrow TypeScript SDK for common SaaS billing workflows:

- create hosted checkouts
- create hosted billing portal links
- verify webhooks
- normalize a small set of common billing events

The goal is portability. OpenBilling keeps the shared workflow surface small, keeps provider differences explicit, and preserves raw provider payloads as escape hatches when you need to drop down a level.

OpenBilling is intentionally lightweight:

- `@openbilling/core` defines the shared contract
- `@openbilling/stripe` implements a fetch-based Stripe adapter
- `@openbilling/dodo` implements a fetch-based Dodo Payments adapter

## Current scope

OpenBilling `v0.1` intentionally focuses on a narrow MVP:

- Stripe and Dodo Payments
- hosted checkout creation
- hosted billing portal creation
- webhook verification
- normalized webhook mapping for a limited event set

It does not try to abstract all billing infrastructure, and it does not currently cover:

- invoices
- refunds
- disputes
- taxes
- usage billing
- seat billing
- payout flows
- marketplace or connect-style flows
- analytics dashboards
- entitlement systems

## Installation

Install the shared contract package plus the adapter you want to run.

Stripe:

```bash
pnpm add @openbilling/core @openbilling/stripe
```

Dodo Payments:

```bash
pnpm add @openbilling/core @openbilling/dodo
```

If your app needs to switch providers at runtime, install all three packages:

```bash
pnpm add @openbilling/core @openbilling/stripe @openbilling/dodo
```

## Quickstart

### Stripe

```ts
import { Payment, Subscription, Webhook } from '@openbilling/core';
import { createStripeProvider } from '@openbilling/stripe';

const billing = createStripeProvider({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});

const checkout = await billing.createCheckout({
  customerEmail: 'demo@example.com',
  priceId: 'price_123',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  mode: 'subscription',
});

const portal = await billing.createPortalLink({
  customerId: 'cus_123',
  returnUrl: 'https://example.com/account',
});

const event = await billing.verifyWebhook({
  payload: rawBody,
  headers: {
    'stripe-signature': request.headers.get('stripe-signature') ?? undefined,
  },
});

switch (event.type) {
  case Payment.Succeeded:
    break;
  case Subscription.Active:
    break;
  case Subscription.Cancelled:
    break;
  case Webhook.Unknown:
    break;
}
```

### Dodo Payments

```ts
import { Payment, Subscription, Webhook } from '@openbilling/core';
import { createDodoProvider } from '@openbilling/dodo';

const billing = createDodoProvider({
  apiKey: process.env.DODO_API_KEY!,
  webhookSecret: process.env.DODO_WEBHOOK_SECRET!,
  baseUrl: 'https://test.dodopayments.com',
});

const checkout = await billing.createCheckout({
  customerEmail: 'demo@example.com',
  productId: 'prod_123',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  mode: 'subscription',
});

const portal = await billing.createPortalLink({
  customerId: 'cus_123',
  returnUrl: 'https://example.com/account',
});

const event = await billing.verifyWebhook({
  payload: rawBody,
  headers: {
    'webhook-id': request.headers.get('webhook-id') ?? undefined,
    'webhook-signature': request.headers.get('webhook-signature') ?? undefined,
    'webhook-timestamp': request.headers.get('webhook-timestamp') ?? undefined,
  },
});

switch (event.type) {
  case Payment.Succeeded:
    break;
  case Subscription.Active:
    break;
  case Subscription.Cancelled:
    break;
  case Webhook.Unknown:
    break;
}
```

## Provider caveats

OpenBilling keeps shared workflows portable, but it does not hide real provider differences.

### Stripe

- checkout creation currently requires `priceId`
- `productId` is not treated as a portable substitute for Stripe
- checkout creation uses Stripe Checkout Sessions for both `payment` and `subscription`
- customer billing management uses Stripe Billing Portal sessions
- the adapter targets `https://api.stripe.com` for both test and live mode; the authenticated key determines the environment
- outbound requests pin `Stripe-Version: 2026-04-22.dahlia`
- webhook verification uses the raw `Stripe-Signature` header with HMAC-SHA256 verification and a 5-minute tolerance window

### Dodo Payments

- checkout creation currently requires `productId`
- `priceId` is not treated as a portable substitute for Dodo
- the Dodo product determines whether a checkout is one-time or recurring
- customer billing management uses Dodo customer portal sessions
- the adapter defaults to `https://live.dodopayments.com`, with `baseUrl` available for test mode or custom hosts
- webhook verification uses `standardwebhooks` plus the raw `webhook-id`, `webhook-signature`, and `webhook-timestamp` headers

## Normalized webhook events

The current normalized event surface is intentionally small.

Available normalized event types:

- `payment.succeeded`
- `subscription.active`
- `subscription.cancelled`
- `unknown`

These map to the exported constants in `@openbilling/core`:

- `Payment.Succeeded`
- `Subscription.Active`
- `Subscription.Cancelled`
- `Webhook.Unknown`

Current Stripe normalization coverage:

- `checkout.session.completed` where `payment_intent` is present
- `payment_intent.succeeded`
- `customer.subscription.created` with active status
- `customer.subscription.updated` with active status
- `customer.subscription.deleted`

Current Dodo normalization coverage:

- `payment.succeeded`
- `subscription.active`
- `subscription.cancelled`

Unsupported events, or events that do not include the minimum fields needed for safe normalization, fall back to:

```ts
{
  type: 'unknown';
}
```

That fallback is intentional. OpenBilling should not fail only because a provider sent an event outside the current MVP surface.

## Monorepo and demo

This repository also includes a Next.js demo app that proves provider portability through shared routes and UI flows.

Demo routes:

- `POST /api/checkout`
- `POST /api/portal`
- `POST /api/webhook`

The homepage redirects to `/pricing/demo`.

To run the monorepo locally:

```bash
git clone https://github.com/georgedimitrov/openbilling.git
cd openbilling
pnpm install
pnpm build
```

To run the demo app:

```bash
cp apps/demo-nextjs/.env.example apps/demo-nextjs/.env.local
pnpm dev
```

The demo centralizes provider switching in `apps/demo-nextjs/src/lib/billing.ts` so the route handlers stay provider-neutral.

## Design principles

- prefer narrow interfaces over premature configuration
- preserve raw provider escape hatches
- optimize for clean TypeScript ergonomics
- avoid overengineering

OpenBilling is designed to make provider switching easy and straightforward for common SaaS billing flows.

## License

MIT. See [LICENSE](./LICENSE).
