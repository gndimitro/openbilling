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

- the current runnable adapter is Dodo
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

Stripe is part of the portability contract in `@openbilling/core`, but the Stripe adapter package is not implemented in this repo yet.

What exists today:

- `Provider.Stripe` exists in the shared provider constants
- the demo app documents `STRIPE_*` environment variables as part of the intended contract

What does not exist yet:

- a runnable `@openbilling/stripe` adapter in this repository

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

Then fill in the Dodo variables in `apps/demo-nextjs/.env.local` and open:

```txt
http://localhost:3000/pricing/demo
```

Important demo notes:

- `BILLING_PROVIDER=dodo` is the runnable path today
- `BILLING_PROVIDER=stripe` is intentionally still a placeholder path
- the demo keeps provider-specific identifiers behind `apps/demo-nextjs/src/lib/billing.ts`
- the app routes stay centered on shared billing workflows rather than provider-specific branches

## License

MIT. See [LICENSE](./LICENSE).
