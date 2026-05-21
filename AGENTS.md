# AGENTS.md

## Project

OpenBilling

Portable billing infrastructure for modern SaaS.

OpenBilling allows applications to switch between billing providers like Stripe and Dodo Payments without rewriting core billing workflows.

This project is intentionally focused on:

- SaaS billing workflows
- provider portability
- normalized webhook handling
- clean TypeScript APIs
- developer experience

This project is NOT intended to become:

- a payment processor
- a universal payment abstraction layer
- a replacement for provider-specific APIs

---

# Product Vision

The long-term vision is:

> Portable billing infrastructure for modern SaaS.

Applications should be able to:

- create checkouts
- manage subscriptions
- access billing portals
- handle webhook events

through a shared interface while still retaining access to provider-specific functionality where necessary.

The abstraction should remain:

- honest
- narrow
- composable

We do NOT attempt to hide all provider differences.

---

# Current MVP Scope

The current MVP supports:

- Stripe
- Dodo Payments

The current SDK should support only:

- checkout creation
- billing portal creation
- webhook verification
- normalized event mapping

The key demo goal:

Changing:

```env
BILLING_PROVIDER=stripe
```

to:

```env
BILLING_PROVIDER=dodo
```

should not require application billing logic rewrites.

---

# Tech Stack

Use:

- TypeScript
- pnpm workspaces
- tsup
- Vitest
- Zod where useful
- Next.js App Router for demo app

Avoid unnecessary dependencies.

---

# Repository Structure

```txt
openbilling/
├── apps/
│   └── demo-nextjs/
│
├── packages/
│   ├── core/
│   ├── stripe/
│   └── dodo/
```

Root-level workspace setup should include:

- `pnpm-workspace.yaml` with `apps/*` and `packages/*`
- `tsconfig.base.json` for shared strict TypeScript defaults
- `.gitignore` covering workspace dependencies, build artifacts, and local environment files
- a private root `package.json` used only for workspace scripts and shared dev dependencies

Current package conventions:

- publishable packages should expose builds from `dist/`
- package scripts should include `build`, `test`, and `typecheck`
- package source should live in `src/` with tests in `test/`
- exported public APIs in publishable packages should include JSDoc in source so editor hovers and generated `.d.ts` files explain contracts clearly
- public JSDoc in publishable package entrypoints should stay aligned with the root `README.md`, especially around provider caveats, supported webhook coverage, and setup expectations

Release documentation conventions:

- the root `README.md` should be external-first for release work, with published-package installation and quickstart guidance ahead of monorepo contributor setup
- contributor-oriented monorepo and demo instructions can live later in the root `README.md`, but should not displace the primary package-consumer path

Demo app conventions:

- `apps/demo-nextjs` is the App Router demo application for proving provider portability through real routes and UI flows
- the demo app centralizes provider switching in `apps/demo-nextjs/src/lib/billing.ts`; app routes should not branch on provider-specific checkout identifiers
- the first demo flow is subscription-focused, uses an email-only checkout form plus a manual customer ID portal form, and keeps provider-specific identifiers server-side in environment variables
- the demo is runnable end-to-end with both Dodo and Stripe through the same provider-neutral routes
- the demo exposes `/api/checkout`, `/api/portal`, and `/api/webhook` as provider-neutral route handlers over the shared `@openbilling/core` contract
- root `pnpm dev` prebuilds and watches `@openbilling/core`, `@openbilling/dodo`, and `@openbilling/stripe` so the Next.js app consumes workspace package public builds from `dist/`
- demo marketing headlines that need a visual line break should prefer styled block spans over raw `<br />` when the full sentence also needs a stable accessible name
- segmented controls in the demo UI should use honest button-group semantics such as `aria-pressed` rather than tab roles unless they actually control tab panels
- demo forms should keep native browser validation enabled unless the UI intentionally replaces it with an equivalent custom validation flow

---

# Package Responsibilities

## @openbilling/core

Contains:

- shared interfaces
- normalized types
- provider contracts
- shared helpers
- the `createBilling` typed identity helper for provider composition

This package must remain provider-agnostic.

Current `@openbilling/core` API conventions:

- provider names should be referenced through `Provider.Stripe` and `Provider.Dodo`, and `BillingProviderName` should be derived from those constants
- `VerifyWebhookInput.payload` uses `string | Uint8Array` to stay runtime-agnostic
- `VerifyWebhookInput` supports optional `secret`, optional `signature`, and optional raw `headers` so providers can verify webhooks from request headers while still allowing config-first secret setup
- `createBilling` should preserve provider-specific subtype information rather than narrowing adapters to the shared interface
- normalized webhook event discriminants should be referenced through grouped constants such as `Subscription.Active`, `Subscription.Cancelled`, `Payment.Succeeded`, and `Webhook.Unknown`

---

## @openbilling/stripe

Contains:

- Stripe provider adapter
- Stripe-specific mappings
- Stripe webhook normalization

Use lightweight direct REST calls instead of the Stripe SDK.

Current `@openbilling/stripe` conventions:

- `createStripeProvider` is fetch-based and targets `https://api.stripe.com` for both test and live mode; the authenticated key determines the environment
- outbound Stripe REST requests pin `Stripe-Version: 2026-04-22.dahlia`
- checkout creation is price-based and currently requires `priceId`; `productId` is not treated as a portable substitute for Stripe
- checkout creation uses Stripe Checkout Sessions for both one-time payments and subscriptions
- customer billing management uses Stripe Billing Portal sessions
- webhook verification uses the raw `Stripe-Signature` header with built-in HMAC-SHA256 verification and a 5-minute tolerance window
- normalized Stripe webhook coverage is intentionally narrow for MVP: `checkout.session.completed`, `payment_intent.succeeded`, `customer.subscription.created`, `customer.subscription.updated` with active status, and `customer.subscription.deleted`; unsupported events map to `Webhook.Unknown`

---

## @openbilling/dodo

Contains:

- Dodo provider adapter
- Dodo webhook normalization

Implementation may initially use lightweight fetch-based wrappers.

Do NOT invent unsupported Dodo features.

Current `@openbilling/dodo` conventions:

- `createDodoProvider` is fetch-based and defaults to `https://live.dodopayments.com`, with `baseUrl` available for test-mode or custom-host overrides
- checkout creation is product-based and currently requires `productId`; `priceId` is not treated as a portable substitute for Dodo
- customer billing management uses Dodo customer portal sessions
- webhook verification uses `standardwebhooks` plus the raw `webhook-id`, `webhook-signature`, and `webhook-timestamp` headers
- normalized Dodo webhook coverage is intentionally narrow for MVP: `payment.succeeded`, `subscription.active`, and `subscription.cancelled`; unsupported events map to `Webhook.Unknown`

---

# Design Principles

## 1. Keep abstractions honest

Do NOT pretend all billing providers are identical.

Only abstract:

- shared SaaS workflows
- common primitives

Provider-specific differences should remain visible where necessary.

---

## 2. Prefer narrow interfaces

Small interfaces are preferred over highly configurable systems.

Avoid premature extensibility.

---

## 3. Preserve escape hatches

Expose provider-specific raw responses where useful.

Example:

```ts
{
  raw: unknown;
}
```

Developers should always be able to drop down to provider-specific functionality.

---

## 4. Optimize for developer experience

Prioritize:

- readable APIs
- clean TypeScript types
- minimal setup
- predictable behavior
- excellent editor autocomplete

---

## 5. Avoid overengineering

This project should remain lightweight.

Avoid:

- plugin systems
- dependency injection frameworks
- event buses
- internal ORM layers
- complex factory abstractions
- excessive configuration

Prefer simple functions and explicit composition.

---

## 6. Type safety matters

Use strong TypeScript typing throughout.

Avoid:

- `any`
- untyped provider outputs
- unsafe casting

Prefer:

- discriminated unions
- explicit interfaces
- inferred return types

---

## 7. Runtime validation should be selective

Use Zod only where runtime validation adds meaningful safety:

- webhook payload normalization
- external API boundaries
- environment validation

Do NOT overuse Zod internally.

---

# Billing Philosophy

OpenBilling abstracts:

- billing workflows

OpenBilling does NOT abstract:

- financial infrastructure
- merchant-of-record semantics
- tax systems
- payout systems
- accounting logic

Some provider differences are fundamentally incompatible and should remain explicit.

---

# Current Non-Goals

The following are intentionally out of scope:

- invoices
- refunds
- disputes
- taxes
- usage billing
- seat billing
- payout flows
- marketplace/connect systems
- analytics dashboards
- entitlement systems

These may be explored later but should NOT influence current architecture.

---

# Webhook Philosophy

Webhook normalization is a core feature.

Normalized events should:

- be small
- stable
- provider-agnostic where reasonable

Unknown provider events should gracefully fallback:

```ts
{
  type: 'unknown';
}
```

Never throw purely because an event is unsupported.

---

# Testing Philosophy

Prefer:

- lightweight unit tests
- mocked provider responses
- contract-level validation
- single-responsibility tests with one behavior or contract per test case

Avoid:

- brittle integration tests
- requiring real billing credentials
- excessive mocking complexity
- super tests that validate multiple unrelated behaviors or contracts in one example

---

# Code Style

Prefer:

- explicit naming
- small files
- composable helpers
- functional patterns where appropriate

Avoid:

- deeply nested abstractions
- magic behavior
- hidden side effects

Code should feel approachable to contributors.

---

# Documentation Philosophy

Documentation is part of the product.

Every package should prioritize:

- readable examples
- minimal setup
- practical usage
- transparent limitations
- AI-agent-first explanations with intentionally explicit wording when documenting public APIs, setup, and current limitations

Avoid marketing-heavy language.

Be technically honest.

---

# Open Source Philosophy

This project is MIT licensed.

The goal is:

- openness
- community contribution
- portability
- transparency

OpenBilling should become:

- easy to adopt
- easy to understand
- easy to extend

---

# Success Criteria

The MVP is successful if:

- a developer can switch providers with minimal code changes
- webhook handling feels consistent
- the TypeScript experience feels excellent
- the repo is understandable to contributors
- the demo app clearly demonstrates provider portability

---

# Important Constraints

Do NOT:

- overbuild abstractions
- optimize for hypothetical providers
- add enterprise complexity
- create internal frameworks

Focus on:

- clarity
- portability
- simplicity
- maintainability
- developer experience
