# OpenBilling

_Portable billing infrastructure for modern SaaS._

**Switch between Stripe and Dodo Payments without rewriting your billing logic**

## Goals

OpenBilling is an early MVP focused on a narrow goal: abstract only the common SaaS billing workflows that most apps need first, without pretending billing providers are identical.

This project is intentionally AI-agent-first. The APIs are small, the contracts are explicit, and the documentation is deliberately overly explicit so both humans and AI agents can understand setup, behavior, and limitations without guessing.

OpenBilling also aims to stay lightweight. The current direction is to prefer direct API calls over large provider SDK wrappers.

## Why OpenBilling exists

Billing provider changes are usually expensive because checkout flows, customer portal flows, and webhook handling leak provider details deep into application code.

OpenBilling exists to reduce that rewrite cost for common SaaS billing workflows:

- create checkouts
- create billing portal links
- verify webhooks
- normalize a small set of common events

**Tl;dr: I wanted to be able to switch between Dodo payments and Stripe without rewriting my billing logic**

## What it does

Today, OpenBilling provides:

- a provider-agnostic core contract in `@openbilling/core`
- a Stripe adapter in `@openbilling/stripe`
- a Dodo Payments adapter in `@openbilling/dodo`
- portable checkout creation
- portable billing portal link creation
- portable webhook verification entrypoints
- normalized webhook events for a narrow MVP event set
- raw provider payload escape hatches when you need provider-specific behavior

This is intentionally limited to common SaaS billing workflows. It is not trying to abstract all billing infrastructure.

## What it does not do

OpenBilling does not aim to be:

- a payment processor
- a universal abstraction over every billing API
- a replacement for provider-specific APIs
- a way to hide all provider differences

OpenBilling also does not currently cover:

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

OpenBilling is currently a source-first early MVP. The packages are present in this monorepo, but the project should be treated as local workspace code for now.

```bash
git clone https://github.com/georgedimitrov/openbilling.git
cd openbilling
pnpm install
pnpm build
```

Current workspace packages:

- `@openbilling/core`
- `@openbilling/stripe`
- `@openbilling/dodo`

## Basic usage

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

Notes:

- the current runnable adapters are Stripe and Dodo
- Stripe checkout creation currently requires `priceId`
- Dodo checkout creation currently requires `productId`
- unsupported provider webhook payloads normalize to `unknown` instead of throwing purely because the event is outside the MVP

## Provider setup

### Dodo Payments

The Dodo adapter is implemented today and is the runnable provider path in this repo.

Required configuration:

- `apiKey`
- `webhookSecret`

Optional configuration:

- `baseUrl`

Important Dodo behavior in the current MVP:

- checkout creation is product-based and currently requires `productId`
- `priceId` is not treated as a portable substitute for Dodo
- the Dodo product determines whether the checkout is one-time or recurring
- webhook verification requires `webhook-id`, `webhook-signature`, and `webhook-timestamp`
- unsupported Dodo events normalize to `unknown`

Example:

```ts
import { createDodoProvider } from '@openbilling/dodo';

const billing = createDodoProvider({
  apiKey: process.env.DODO_API_KEY!,
  webhookSecret: process.env.DODO_WEBHOOK_SECRET!,
  baseUrl: 'https://test.dodopayments.com',
});
```

### Stripe

The Stripe adapter is implemented as a lightweight fetch-based package in this repo.

Required configuration:

- `apiKey`
- `webhookSecret`

Important Stripe behavior in the current MVP:

- checkout creation is price-based and currently requires `priceId`
- checkout creation uses Stripe Checkout Sessions for both `payment` and `subscription` modes
- billing management uses Stripe Billing Portal sessions
- Stripe test and live mode both use `https://api.stripe.com`; the key determines the environment
- outbound Stripe REST requests pin `Stripe-Version: 2026-04-22.dahlia`
- webhook verification uses the raw `Stripe-Signature` header with manual HMAC verification
- normalized Stripe webhook coverage is intentionally narrow for MVP: `checkout.session.completed`, `payment_intent.succeeded`, `customer.subscription.created`, `customer.subscription.updated` with active status, and `customer.subscription.deleted`

Example:

```ts
import { createStripeProvider } from '@openbilling/stripe';

const billing = createStripeProvider({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});
```

## Normalized webhook events

The current normalized event surface is intentionally small.

Available event types in `@openbilling/core`:

- `payment.succeeded`
- `subscription.active`
- `subscription.cancelled`
- `unknown`

These map to the exported constants:

- `Payment.Succeeded`
- `Subscription.Active`
- `Subscription.Cancelled`
- `Webhook.Unknown`

Current Dodo webhook normalization coverage is intentionally narrow for the MVP:

- `payment.succeeded`
- `subscription.active`
- `subscription.cancelled`

Current Stripe webhook normalization coverage is intentionally narrow for the MVP:

- `checkout.session.completed` where `payment_intent` is present
- `payment_intent.succeeded`
- `customer.subscription.created` with active status
- `customer.subscription.updated` with active status
- `customer.subscription.deleted`

If an event is unsupported or does not contain the minimum fields needed for safe normalization, OpenBilling returns:

```ts
{
  type: 'unknown';
}
```

That fallback is intentional. OpenBilling should not fail only because a provider sent an event outside the current MVP surface.

## Demo app

The demo app lives in `apps/demo-nextjs`.

Its purpose is to prove provider portability through provider-neutral routes and a minimal UI:

- `POST /api/checkout`
- `POST /api/portal`
- `POST /api/webhook`

The homepage redirects to `/pricing/demo`.

To run the demo:

```bash
cp apps/demo-nextjs/.env.example apps/demo-nextjs/.env.local
pnpm dev
```

Then fill in the provider variables that match your chosen `BILLING_PROVIDER` in `apps/demo-nextjs/.env.local` and open:

```txt
http://localhost:3000/pricing/demo
```

Important demo notes:

- set `BILLING_PROVIDER=dodo` and fill the `DODO_*` variables to demo Dodo
- set `BILLING_PROVIDER=stripe` and fill the `STRIPE_*` variables to demo Stripe
- the demo keeps provider-specific identifiers behind `apps/demo-nextjs/src/lib/billing.ts`
- the app routes stay centered on shared billing workflows rather than provider-specific branches

## License

MIT. See [LICENSE](./LICENSE).
