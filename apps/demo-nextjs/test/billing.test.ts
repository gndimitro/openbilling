import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

describe("billing helper", () => {
  it("creates a Dodo provider without requiring inactive Stripe env vars", async () => {
    process.env.BILLING_PROVIDER = "dodo";
    process.env.DODO_API_KEY = "dodo_api_key";
    process.env.DODO_WEBHOOK_SECRET = "whsec_dodo";
    process.env.DODO_PRODUCT_ID = "prod_dodo";

    const billing = await import("../src/lib/billing");
    const provider = billing.getBillingProvider();

    expect(provider).toMatchObject({
      createCheckout: expect.any(Function),
      createPortalLink: expect.any(Function),
      verifyWebhook: expect.any(Function)
    });
  });

  it("builds a subscription checkout input from env-backed provider config", async () => {
    process.env.BILLING_PROVIDER = "dodo";
    process.env.DODO_API_KEY = "dodo_api_key";
    process.env.DODO_WEBHOOK_SECRET = "whsec_dodo";
    process.env.DODO_PRODUCT_ID = "prod_dodo";

    const billing = await import("../src/lib/billing");

    expect(
      billing.buildDemoCheckoutInput({
        customerEmail: "demo@example.com",
        origin: "https://demo.openbilling.dev"
      })
    ).toEqual({
      customerEmail: "demo@example.com",
      productId: "prod_dodo",
      successUrl: "https://demo.openbilling.dev/success",
      cancelUrl: "https://demo.openbilling.dev/cancel",
      mode: "subscription"
    });
  });

  it("throws a clear unsupported error when Stripe is selected", async () => {
    process.env.BILLING_PROVIDER = "stripe";

    const billing = await import("../src/lib/billing");

    expect(() => billing.getBillingProvider()).toThrowError("BILLING_PROVIDER=stripe is not implemented yet in this repo.");
  });
});
