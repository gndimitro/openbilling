# @openbilling/stripe

Stripe adapter for OpenBilling.

`@openbilling/stripe` provides a fetch-based Stripe adapter that implements the shared `@openbilling/core` billing contract. It supports the current OpenBilling MVP workflows for Stripe Checkout Sessions, Stripe Billing Portal sessions, webhook verification, and normalized webhook mapping.

This package keeps Stripe-specific behavior visible where it matters. Checkout creation is price-based and currently requires `priceId`; `productId` is not treated as a portable substitute for Stripe.

## Install

```bash
npm install @openbilling/core @openbilling/stripe
```

## Links

- Documentation: [openbilling.geodim.dev](https://openbilling.geodim.dev)
- Repository: [github.com/gndimitro/openbilling](https://github.com/gndimitro/openbilling)
