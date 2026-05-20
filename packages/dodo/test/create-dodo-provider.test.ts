import { describe, expect, expectTypeOf, it, beforeEach, afterEach, vi } from "vitest";
import { Webhook as StandardWebhook } from "standardwebhooks";

import {
  Payment,
  Provider,
  Subscription,
  Webhook,
  type BillingProvider
} from "@openbilling/core";

import {
  createDodoProvider,
  type DodoProviderConfig
} from "../src/index";

const baseConfig: DodoProviderConfig = {
  apiKey: "dodo_api_key",
  webhookSecret: "whsec_default"
};

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    ...init
  });
}

function createSignedHeaders(secret: string, payload: string) {
  const webhook = new StandardWebhook(secret);
  const timestamp = new Date();
  const webhookId = "evt_123";

  return {
    "webhook-id": webhookId,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": webhook.sign(webhookId, timestamp, payload)
  };
}

describe("createDodoProvider", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports the Dodo provider config and factory types", () => {
    const provider = createDodoProvider(baseConfig);

    expectTypeOf<DodoProviderConfig>().toEqualTypeOf<{
      apiKey: string;
      webhookSecret: string;
      baseUrl?: string;
    }>();
    expectTypeOf(provider).toMatchTypeOf<BillingProvider>();
  });

  it("creates a payment checkout session with the default Dodo host", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        session_id: "sess_payment",
        checkout_url: "https://checkout.dodopayments.com/session/payment"
      })
    );

    const provider = createDodoProvider(baseConfig);
    const result = await provider.createCheckout({
      customerEmail: "demo@example.com",
      productId: "prod_payment",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "payment",
      metadata: {
        teamId: "team_123"
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://live.dodopayments.com/checkouts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer dodo_api_key",
          "content-type": "application/json"
        })
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];

    expect(JSON.parse(String(requestInit?.body))).toEqual({
      product_cart: [
        {
          product_id: "prod_payment",
          quantity: 1
        }
      ],
      customer: {
        email: "demo@example.com"
      },
      return_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      metadata: {
        teamId: "team_123"
      }
    });

    expect(result).toEqual({
      id: "sess_payment",
      url: "https://checkout.dodopayments.com/session/payment",
      provider: Provider.Dodo,
      raw: {
        session_id: "sess_payment",
        checkout_url: "https://checkout.dodopayments.com/session/payment"
      }
    });
  });

  it("creates a subscription checkout session for an existing customer", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        session_id: "sess_subscription",
        checkout_url: "https://checkout.dodopayments.com/session/subscription"
      })
    );

    const provider = createDodoProvider(baseConfig);
    const result = await provider.createCheckout({
      customerId: "cus_123",
      productId: "prod_subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "subscription"
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];

    expect(JSON.parse(String(requestInit?.body))).toEqual({
      product_cart: [
        {
          product_id: "prod_subscription",
          quantity: 1
        }
      ],
      customer_id: "cus_123",
      return_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel"
    });

    expect(result.provider).toBe(Provider.Dodo);
    expect(result.id).toBe("sess_subscription");
  });

  it("throws a safe unsupported error when Dodo-compatible product input is missing", async () => {
    const provider = createDodoProvider(baseConfig);

    await expect(
      provider.createCheckout({
        priceId: "price_only",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment"
      })
    ).rejects.toMatchObject({
      name: "DodoProviderError",
      code: "unsupported_input"
    });

    await expect(
      provider.createCheckout({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "subscription"
      })
    ).rejects.toMatchObject({
      name: "DodoProviderError",
      code: "unsupported_input"
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a customer portal link using the configured base URL", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        link: "https://customer-portal.dodopayments.com/session/portal"
      })
    );

    const provider = createDodoProvider({
      ...baseConfig,
      baseUrl: "https://test.dodopayments.com/"
    });

    const result = await provider.createPortalLink({
      customerId: "cus_123",
      returnUrl: "https://example.com/account"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, requestInit] = fetchMock.mock.calls[0] ?? [];

    expect(String(url)).toBe(
      "https://test.dodopayments.com/customers/cus_123/customer-portal/session?return_url=https%3A%2F%2Fexample.com%2Faccount"
    );
    expect(requestInit).toEqual(
      expect.objectContaining({
        method: "POST"
      })
    );

    expect(result).toEqual({
      url: "https://customer-portal.dodopayments.com/session/portal",
      provider: Provider.Dodo,
      raw: {
        link: "https://customer-portal.dodopayments.com/session/portal"
      }
    });
  });

  it("wraps Dodo API failures in a provider-specific error", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          message: "Invalid product"
        },
        {
          status: 422,
          statusText: "Unprocessable Entity"
        }
      )
    );

    const provider = createDodoProvider(baseConfig);

    await expect(
      provider.createCheckout({
        productId: "prod_invalid",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment"
      })
    ).rejects.toMatchObject({
      name: "DodoProviderError",
      code: "api_error",
      status: 422
    });
  });

  it("verifies and normalizes a payment.succeeded webhook with the configured secret", async () => {
    const payload = JSON.stringify({
      type: Payment.Succeeded,
      data: {
        payment_id: "pay_123",
        customer: {
          customer_id: "cus_123"
        }
      }
    });

    const provider = createDodoProvider(baseConfig);
    const result = await provider.verifyWebhook({
      payload,
      headers: createSignedHeaders(baseConfig.webhookSecret, payload)
    });

    expect(result).toEqual({
      type: Payment.Succeeded,
      provider: Provider.Dodo,
      customerId: "cus_123",
      paymentId: "pay_123",
      raw: {
        type: Payment.Succeeded,
        data: {
          payment_id: "pay_123",
          customer: {
            customer_id: "cus_123"
          }
        }
      }
    });
  });

  it("verifies and normalizes subscription lifecycle webhooks", async () => {
    const activePayload = JSON.stringify({
      type: Subscription.Active,
      data: {
        subscription_id: "sub_active",
        customer: {
          customer_id: "cus_active"
        }
      }
    });
    const cancelledPayload = JSON.stringify({
      type: Subscription.Cancelled,
      data: {
        subscription_id: "sub_cancelled",
        customer: {
          customer_id: "cus_cancelled"
        }
      }
    });
    const provider = createDodoProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload: activePayload,
        headers: createSignedHeaders(baseConfig.webhookSecret, activePayload)
      })
    ).resolves.toEqual({
      type: Subscription.Active,
      provider: Provider.Dodo,
      customerId: "cus_active",
      subscriptionId: "sub_active",
      raw: {
        type: Subscription.Active,
        data: {
          subscription_id: "sub_active",
          customer: {
            customer_id: "cus_active"
          }
        }
      }
    });

    await expect(
      provider.verifyWebhook({
        payload: cancelledPayload,
        headers: createSignedHeaders(baseConfig.webhookSecret, cancelledPayload)
      })
    ).resolves.toEqual({
      type: Subscription.Cancelled,
      provider: Provider.Dodo,
      customerId: "cus_cancelled",
      subscriptionId: "sub_cancelled",
      raw: {
        type: Subscription.Cancelled,
        data: {
          subscription_id: "sub_cancelled",
          customer: {
            customer_id: "cus_cancelled"
          }
        }
      }
    });
  });

  it("falls back to an unknown webhook event for unsupported Dodo payloads", async () => {
    const payload = JSON.stringify({
      type: "payment.failed",
      data: {
        payment_id: "pay_failed"
      }
    });
    const provider = createDodoProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload,
        headers: createSignedHeaders(baseConfig.webhookSecret, payload)
      })
    ).resolves.toEqual({
      type: Webhook.Unknown,
      provider: Provider.Dodo,
      raw: {
        type: "payment.failed",
        data: {
          payment_id: "pay_failed"
        }
      }
    });
  });

  it("allows the webhook secret to be overridden per call", async () => {
    const overrideSecret = "whsec_override";
    const payload = JSON.stringify({
      type: Payment.Succeeded,
      data: {
        payment_id: "pay_override"
      }
    });
    const provider = createDodoProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload,
        headers: createSignedHeaders(overrideSecret, payload),
        secret: overrideSecret
      })
    ).resolves.toMatchObject({
      type: Payment.Succeeded,
      paymentId: "pay_override",
      provider: Provider.Dodo
    });
  });

  it("returns a safe error when required webhook headers are missing", async () => {
    const provider = createDodoProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload: JSON.stringify({
          type: Payment.Succeeded
        }),
        headers: {
          "webhook-id": "evt_missing"
        }
      })
    ).rejects.toMatchObject({
      name: "DodoProviderError",
      code: "invalid_webhook_headers"
    });
  });
});
