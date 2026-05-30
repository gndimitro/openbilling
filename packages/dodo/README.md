# @openbilling/dodo

Dodo Payments adapter for OpenBilling.

`@openbilling/dodo` provides a fetch-based Dodo Payments adapter that implements the shared `@openbilling/core` billing contract. It supports the current OpenBilling MVP workflows for hosted checkout creation, customer portal links, webhook verification, and normalized webhook mapping.

This package keeps Dodo-specific behavior visible where it matters. Checkout creation is product-based and currently requires `productId`; Dodo determines whether the checkout is one-time or recurring from the configured product.

## Install

```bash
npm install @openbilling/core @openbilling/dodo
```

## Links

- Documentation: [openbilling.geodim.dev](https://openbilling.geodim.dev)
- Repository: [github.com/gndimitro/openbilling](https://github.com/gndimitro/openbilling)
