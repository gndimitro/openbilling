# @openbilling/core

Shared TypeScript contract for OpenBilling.

`@openbilling/core` contains the provider-agnostic billing interfaces, normalized webhook event types, provider name constants, and the `createBilling` helper used by OpenBilling adapters. Install it alongside a provider package such as `@openbilling/stripe` or `@openbilling/dodo`.

This package does not call billing provider APIs directly. It defines the narrow shared surface for hosted checkout creation, billing portal links, webhook verification inputs, and normalized webhook results so application billing logic can stay portable where the providers genuinely overlap.

## Install

```bash
npm install @openbilling/core
```

## Links

- Documentation: [openbilling.geodim.dev](https://openbilling.geodim.dev)
- Repository: [github.com/gndimitro/openbilling](https://github.com/gndimitro/openbilling)
