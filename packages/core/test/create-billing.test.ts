import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  Provider,
  Webhook,
  createBilling,
  type BillingProvider,
  type CheckoutResult,
  type CreateCheckoutInput,
  type CreatePortalLinkInput,
  type NormalizedWebhookEvent,
  type PortalLinkResult,
  type VerifyWebhookInput
} from "../src/index";

type TestProvider = BillingProvider & {
  readonly providerName: typeof Provider.Stripe;
  getDiagnostics(): string;
};

function createTestProvider(): TestProvider {
  return {
    providerName: Provider.Stripe,
    getDiagnostics() {
      return "healthy";
    },
    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
      return {
        id: `checkout:${input.mode}`,
        url: input.successUrl,
        provider: Provider.Stripe
      };
    },
    async createPortalLink(input: CreatePortalLinkInput): Promise<PortalLinkResult> {
      return {
        url: input.returnUrl,
        provider: Provider.Stripe
      };
    },
    async verifyWebhook(_input: VerifyWebhookInput): Promise<NormalizedWebhookEvent> {
      return {
        type: Webhook.Unknown,
        provider: Provider.Stripe
      };
    }
  };
}

describe("createBilling", () => {
  it("returns the same provider reference", () => {
    const provider = createTestProvider();

    const billing = createBilling(provider);

    expect(billing).toBe(provider);
  });

  it("preserves async provider method behavior", async () => {
    const provider = createTestProvider();
    const createCheckout = vi.fn(provider.createCheckout);
    provider.createCheckout = createCheckout;

    const billing = createBilling(provider);
    const input: CreateCheckoutInput = {
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "subscription"
    };

    await expect(billing.createCheckout(input)).resolves.toEqual({
      id: "checkout:subscription",
      url: "https://example.com/success",
      provider: Provider.Stripe
    });
    expect(createCheckout).toHaveBeenCalledWith(input);
  });

  it("preserves provider-specific members at the type level", () => {
    const provider = createTestProvider();
    const billing = createBilling(provider);

    expectTypeOf(billing).toEqualTypeOf<TestProvider>();
    expect(billing.getDiagnostics()).toBe("healthy");
    expect(billing.providerName).toBe(Provider.Stripe);
  });
});
