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
- `createBilling` should preserve provider-specific subtype information rather than narrowing adapters to the shared interface
- normalized webhook event discriminants should be referenced through grouped constants such as `Subscription.Active`, `Subscription.Cancelled`, `Payment.Succeeded`, and `Webhook.Unknown`

---

## @openbilling/stripe

Contains:
- Stripe provider adapter
- Stripe-specific mappings
- Stripe webhook normalization

Use official Stripe SDK.

---

## @openbilling/dodo

Contains:
- Dodo provider adapter
- Dodo webhook normalization

Implementation may initially use lightweight fetch-based wrappers.

Do NOT invent unsupported Dodo features.

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
  raw: unknown
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
  type: "unknown"
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
