import {
  Provider,
  type BillingMode,
  type BillingProvider,
  type BillingProviderName,
  type CreateCheckoutInput,
} from '@openbilling/core';
import { createDodoProvider } from '@openbilling/dodo';

export const DEMO_CHECKOUT_MODE: BillingMode = 'subscription';

type DemoCheckoutInputOptions = {
  customerEmail: string;
  origin: string;
};

export function getConfiguredProviderName(): BillingProviderName {
  switch (process.env.BILLING_PROVIDER) {
    case Provider.Stripe:
      return Provider.Stripe;
    case Provider.Dodo:
      return Provider.Dodo;
    default:
      throw new Error(
        'Unsupported BILLING_PROVIDER. Expected "stripe" or "dodo".',
      );
  }
}

export function getBillingProvider(): BillingProvider {
  switch (getConfiguredProviderName()) {
    case Provider.Stripe:
      throw new Error(
        'BILLING_PROVIDER=stripe is not implemented yet in this repo.',
      );

    case Provider.Dodo:
      return createDodoProvider({
        apiKey: requireEnv('DODO_API_KEY'),
        webhookSecret: requireEnv('DODO_WEBHOOK_SECRET'),
        baseUrl: 'https://test.dodopayments.com',
      });
  }
}

export function buildDemoCheckoutInput({
  customerEmail,
  origin,
}: DemoCheckoutInputOptions): CreateCheckoutInput {
  const baseInput = {
    customerEmail,
    successUrl: `${normalizeOrigin(origin)}/success`,
    cancelUrl: `${normalizeOrigin(origin)}/cancel`,
    mode: DEMO_CHECKOUT_MODE,
  } satisfies Pick<
    CreateCheckoutInput,
    'customerEmail' | 'successUrl' | 'cancelUrl' | 'mode'
  >;

  switch (getConfiguredProviderName()) {
    case Provider.Stripe:
      return {
        ...baseInput,
        priceId: requireEnv('STRIPE_PRICE_ID'),
      };

    case Provider.Dodo:
      return {
        ...baseInput,
        productId: requireEnv('DODO_PRODUCT_ID'),
      };
  }
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
}
