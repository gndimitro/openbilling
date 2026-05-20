import { describe, expect, expectTypeOf, it } from "vitest";

import {
  Payment,
  Provider,
  Subscription,
  Webhook
} from "../src/index";

import type {
  BillingMode,
  BillingProviderName,
  CheckoutResult,
  CreateCheckoutInput,
  CreatePortalLinkInput,
  NormalizedWebhookEvent,
  PortalLinkResult,
  VerifyWebhookInput
} from "../src/index";

describe("core contracts", () => {
  it("accepts a subscription.active webhook event", () => {
    const event: NormalizedWebhookEvent = {
      type: Subscription.Active,
      provider: Provider.Stripe,
      customerId: "cus_123",
      subscriptionId: "sub_123"
    };

    expect(event.type).toBe(Subscription.Active);
    expect(event.provider).toBe(Provider.Stripe);
  });

  it("accepts a subscription.cancelled webhook event", () => {
    const event: NormalizedWebhookEvent = {
      type: Subscription.Cancelled,
      provider: Provider.Dodo,
      customerId: "cus_456",
      subscriptionId: "sub_456"
    };

    expect(event.type).toBe(Subscription.Cancelled);
    expect(event.provider).toBe(Provider.Dodo);
  });

  it("accepts a payment.succeeded webhook event", () => {
    const event: NormalizedWebhookEvent = {
      type: Payment.Succeeded,
      provider: Provider.Stripe,
      customerId: "cus_789",
      paymentId: "pay_789"
    };

    expect(event.type).toBe(Payment.Succeeded);
    expect(event.paymentId).toBe("pay_789");
  });

  it("accepts an unknown webhook event", () => {
    const event: NormalizedWebhookEvent = {
      type: Webhook.Unknown,
      provider: Provider.Dodo
    };

    expect(event.type).toBe(Webhook.Unknown);
    expect(event.provider).toBe(Provider.Dodo);
  });

  it("accepts the checkout input contract", () => {
    const checkoutInput: CreateCheckoutInput = {
      customerId: "cus_123",
      customerEmail: "demo@example.com",
      productId: "prod_123",
      priceId: "price_123",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "payment",
      metadata: {
        teamId: "team_123"
      }
    };

    expect(checkoutInput.mode).toBe("payment");
    expect(checkoutInput.metadata).toEqual({
      teamId: "team_123"
    });
  });

  it("accepts the portal link input contract", () => {
    const portalInput: CreatePortalLinkInput = {
      customerId: "cus_123",
      returnUrl: "https://example.com/account"
    };

    expect(portalInput.customerId).toBe("cus_123");
    expect(portalInput.returnUrl).toBe("https://example.com/account");
  });

  it("accepts the checkout result contract", () => {
    const checkoutResult: CheckoutResult = {
      id: "checkout_123",
      url: "https://example.com/checkout",
      provider: Provider.Stripe
    };

    expect(checkoutResult.id).toBe("checkout_123");
    expect(checkoutResult.provider).toBe(Provider.Stripe);
  });

  it("accepts the portal result contract", () => {
    const portalResult: PortalLinkResult = {
      url: "https://example.com/portal",
      provider: Provider.Dodo
    };

    expect(portalResult.url).toBe("https://example.com/portal");
    expect(portalResult.provider).toBe(Provider.Dodo);
  });

  it("accepts a string webhook payload", () => {
    const webhookFromString: VerifyWebhookInput = {
      payload: "{\"type\":\"ping\"}",
      signature: "sig_header",
      secret: "secret_123"
    };

    expect(typeof webhookFromString.payload).toBe("string");
  });

  it("accepts a Uint8Array webhook payload", () => {
    const webhookFromBytes: VerifyWebhookInput = {
      payload: new Uint8Array([1, 2, 3]),
      signature: "sig_header",
      secret: "secret_123"
    };

    expect(webhookFromBytes.payload).toBeInstanceOf(Uint8Array);
  });

  it("exports the BillingProviderName union", () => {
    expectTypeOf<BillingProviderName>().toEqualTypeOf<"stripe" | "dodo">();
  });

  it("exports grouped provider constants", () => {
    expect(Provider.Stripe).toBe("stripe");
    expect(Provider.Dodo).toBe("dodo");
  });

  it("exports the BillingMode union", () => {
    expectTypeOf<BillingMode>().toEqualTypeOf<"payment" | "subscription">();
  });

  it("exports grouped subscription event constants", () => {
    expect(Subscription.Active).toBe("subscription.active");
    expect(Subscription.Cancelled).toBe("subscription.cancelled");
  });

  it("exports grouped payment event constants", () => {
    expect(Payment.Succeeded).toBe("payment.succeeded");
  });

  it("exports grouped webhook fallback constants", () => {
    expect(Webhook.Unknown).toBe("unknown");
  });

  it("exports the webhook payload input union", () => {
    expectTypeOf<VerifyWebhookInput["payload"]>().toEqualTypeOf<string | Uint8Array>();
  });

  it("uses the subscription constant type for active subscription events", () => {
    expectTypeOf<Extract<NormalizedWebhookEvent, { type: typeof Subscription.Active }>["type"]>().toEqualTypeOf<
      typeof Subscription.Active
    >();
  });

  it("uses the subscription constant type for cancelled subscription events", () => {
    expectTypeOf<
      Extract<NormalizedWebhookEvent, { type: typeof Subscription.Cancelled }>["type"]
    >().toEqualTypeOf<typeof Subscription.Cancelled>();
  });

  it("uses the payment constant type for successful payment events", () => {
    expectTypeOf<Extract<NormalizedWebhookEvent, { type: typeof Payment.Succeeded }>["type"]>().toEqualTypeOf<
      typeof Payment.Succeeded
    >();
  });

  it("uses the webhook constant type for unknown events", () => {
    expectTypeOf<Extract<NormalizedWebhookEvent, { type: typeof Webhook.Unknown }>["type"]>().toEqualTypeOf<
      typeof Webhook.Unknown
    >();
  });

  it("uses BillingProviderName for checkout results", () => {
    expectTypeOf<CheckoutResult["provider"]>().toEqualTypeOf<BillingProviderName>();
  });

  it("uses BillingProviderName for portal link results", () => {
    expectTypeOf<PortalLinkResult["provider"]>().toEqualTypeOf<BillingProviderName>();
  });

  it("derives BillingProviderName from the Provider constants", () => {
    expectTypeOf<BillingProviderName>().toEqualTypeOf<(typeof Provider)[keyof typeof Provider]>();
  });
});
