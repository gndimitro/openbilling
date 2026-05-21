import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  Payment,
  Provider,
  Subscription,
  Webhook,
  type BillingProvider
} from "@openbilling/core";

import {
  createStripeProvider,
  type StripeProviderConfig
} from "../src/index";

const baseConfig: StripeProviderConfig = {
  apiKey: "rk_test_stripe",
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

async function createSignatureHeader(
  secret: string,
  payload: string,
  timestamp = Math.floor(Date.now() / 1000)
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));

  return `t=${timestamp},v1=${toHex(signature)}`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

function getRequestBody(requestInit: RequestInit | undefined): URLSearchParams {
  return new URLSearchParams(String(requestInit?.body));
}

describe("createStripeProvider", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports the Stripe provider config and factory types", () => {
    const provider = createStripeProvider(baseConfig);

    expectTypeOf<StripeProviderConfig>().toEqualTypeOf<{
      apiKey: string;
      webhookSecret: string;
    }>();
    expectTypeOf(provider).toMatchTypeOf<BillingProvider>();
  });

  it("creates a payment checkout session using Stripe Checkout", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        id: "cs_payment",
        url: "https://checkout.stripe.com/c/pay/cs_payment"
      })
    );

    const provider = createStripeProvider(baseConfig);
    const result = await provider.createCheckout({
      customerEmail: "demo@example.com",
      priceId: "price_payment",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "payment",
      metadata: {
        teamId: "team_123"
      }
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/checkout/sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer rk_test_stripe",
          "content-type": "application/x-www-form-urlencoded",
          "stripe-version": "2026-04-22.dahlia"
        })
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = getRequestBody(requestInit);

    expect(body.get("mode")).toBe("payment");
    expect(body.get("success_url")).toBe("https://example.com/success");
    expect(body.get("cancel_url")).toBe("https://example.com/cancel");
    expect(body.get("customer_email")).toBe("demo@example.com");
    expect(body.get("line_items[0][price]")).toBe("price_payment");
    expect(body.get("line_items[0][quantity]")).toBe("1");
    expect(body.get("metadata[teamId]")).toBe("team_123");

    expect(result).toEqual({
      id: "cs_payment",
      url: "https://checkout.stripe.com/c/pay/cs_payment",
      provider: Provider.Stripe,
      raw: {
        id: "cs_payment",
        url: "https://checkout.stripe.com/c/pay/cs_payment"
      }
    });
  });

  it("creates a subscription checkout session for an existing customer", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        id: "cs_subscription",
        url: "https://checkout.stripe.com/c/pay/cs_subscription"
      })
    );

    const provider = createStripeProvider(baseConfig);
    await provider.createCheckout({
      customerId: "cus_123",
      customerEmail: "ignored@example.com",
      priceId: "price_subscription",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      mode: "subscription"
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = getRequestBody(requestInit);

    expect(body.get("mode")).toBe("subscription");
    expect(body.get("customer")).toBe("cus_123");
    expect(body.has("customer_email")).toBe(false);
  });

  it("throws a safe unsupported error when Stripe price input is missing", async () => {
    const provider = createStripeProvider(baseConfig);

    await expect(
      provider.createCheckout({
        productId: "prod_only",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment"
      })
    ).rejects.toMatchObject({
      name: "StripeProviderError",
      code: "unsupported_input"
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe billing portal session", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        id: "bps_123",
        url: "https://billing.stripe.com/p/session/test_123"
      })
    );

    const provider = createStripeProvider(baseConfig);
    const result = await provider.createPortalLink({
      customerId: "cus_123",
      returnUrl: "https://example.com/account"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/billing_portal/sessions",
      expect.objectContaining({
        method: "POST"
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = getRequestBody(requestInit);

    expect(body.get("customer")).toBe("cus_123");
    expect(body.get("return_url")).toBe("https://example.com/account");
    expect(result).toEqual({
      url: "https://billing.stripe.com/p/session/test_123",
      provider: Provider.Stripe,
      raw: {
        id: "bps_123",
        url: "https://billing.stripe.com/p/session/test_123"
      }
    });
  });

  it("wraps Stripe API failures in a provider-specific error", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: {
            message: "Invalid price"
          }
        },
        {
          status: 422,
          statusText: "Unprocessable Entity"
        }
      )
    );

    const provider = createStripeProvider(baseConfig);

    await expect(
      provider.createCheckout({
        priceId: "price_invalid",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment"
      })
    ).rejects.toMatchObject({
      name: "StripeProviderError",
      code: "api_error",
      status: 422
    });
  });

  it("verifies a subscription.active webhook using the direct signature input", async () => {
    const payload = JSON.stringify({
      id: "evt_active",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active"
        }
      }
    });
    const provider = createStripeProvider(baseConfig);

    const event = await provider.verifyWebhook({
      payload,
      signature: await createSignatureHeader(baseConfig.webhookSecret, payload)
    });

    expect(event).toEqual({
      type: Subscription.Active,
      provider: Provider.Stripe,
      customerId: "cus_123",
      subscriptionId: "sub_123",
      raw: expect.objectContaining({
        id: "evt_active",
        type: "customer.subscription.updated"
      })
    });
  });

  it("verifies a subscription.cancelled webhook from request headers", async () => {
    const payload = JSON.stringify({
      id: "evt_cancelled",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_456",
          customer: "cus_456"
        }
      }
    });
    const provider = createStripeProvider(baseConfig);

    const event = await provider.verifyWebhook({
      payload,
      headers: {
        "Stripe-Signature": await createSignatureHeader(baseConfig.webhookSecret, payload)
      }
    });

    expect(event).toEqual({
      type: Subscription.Cancelled,
      provider: Provider.Stripe,
      customerId: "cus_456",
      subscriptionId: "sub_456",
      raw: expect.objectContaining({
        id: "evt_cancelled",
        type: "customer.subscription.deleted"
      })
    });
  });

  it("verifies a payment.succeeded webhook from checkout completion where possible", async () => {
    const payload = JSON.stringify({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_123",
          payment_intent: "pi_123"
        }
      }
    });
    const provider = createStripeProvider(baseConfig);

    const event = await provider.verifyWebhook({
      payload: new TextEncoder().encode(payload),
      signature: await createSignatureHeader(baseConfig.webhookSecret, payload)
    });

    expect(event).toEqual({
      type: Payment.Succeeded,
      provider: Provider.Stripe,
      customerId: "cus_123",
      paymentId: "pi_123",
      raw: expect.objectContaining({
        id: "evt_checkout_completed",
        type: "checkout.session.completed"
      })
    });
  });

  it("verifies a payment_intent.succeeded event as payment.succeeded", async () => {
    const payload = JSON.stringify({
      id: "evt_payment_intent",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_456",
          customer: "cus_456"
        }
      }
    });
    const provider = createStripeProvider(baseConfig);

    const event = await provider.verifyWebhook({
      payload,
      signature: await createSignatureHeader(baseConfig.webhookSecret, payload)
    });

    expect(event).toEqual({
      type: Payment.Succeeded,
      provider: Provider.Stripe,
      customerId: "cus_456",
      paymentId: "pi_456",
      raw: expect.objectContaining({
        id: "evt_payment_intent",
        type: "payment_intent.succeeded"
      })
    });
  });

  it("falls back to unknown for unsupported or partial payloads", async () => {
    const provider = createStripeProvider(baseConfig);
    const unsupportedPayload = JSON.stringify({
      id: "evt_unknown",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_123"
        }
      }
    });
    const partialPayload = JSON.stringify({
      id: "evt_partial",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_partial"
        }
      }
    });

    await expect(
      provider.verifyWebhook({
        payload: unsupportedPayload,
        signature: await createSignatureHeader(baseConfig.webhookSecret, unsupportedPayload)
      })
    ).resolves.toEqual({
      type: Webhook.Unknown,
      provider: Provider.Stripe,
      raw: expect.objectContaining({
        id: "evt_unknown",
        type: "invoice.paid"
      })
    });

    await expect(
      provider.verifyWebhook({
        payload: partialPayload,
        signature: await createSignatureHeader(baseConfig.webhookSecret, partialPayload)
      })
    ).resolves.toEqual({
      type: Webhook.Unknown,
      provider: Provider.Stripe,
      raw: expect.objectContaining({
        id: "evt_partial",
        type: "checkout.session.completed"
      })
    });
  });

  it("rejects webhook verification when the signature is missing", async () => {
    const provider = createStripeProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload: "{\"id\":\"evt_missing\"}"
      })
    ).rejects.toMatchObject({
      name: "StripeProviderError",
      code: "invalid_webhook_signature"
    });
  });

  it("rejects webhook verification when the signature header is malformed", async () => {
    const provider = createStripeProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload: "{\"id\":\"evt_bad_header\"}",
        signature: "v1=missing_timestamp"
      })
    ).rejects.toMatchObject({
      name: "StripeProviderError",
      code: "invalid_webhook_signature"
    });
  });

  it("rejects webhook verification when the signature does not match", async () => {
    const payload = JSON.stringify({
      id: "evt_invalid_signature"
    });
    const provider = createStripeProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload,
        signature: await createSignatureHeader("whsec_other", payload)
      })
    ).rejects.toMatchObject({
      name: "StripeProviderError",
      code: "invalid_webhook_signature"
    });
  });

  it("rejects webhook verification when the signature timestamp is stale", async () => {
    const payload = JSON.stringify({
      id: "evt_stale"
    });
    const provider = createStripeProvider(baseConfig);

    await expect(
      provider.verifyWebhook({
        payload,
        signature: await createSignatureHeader(baseConfig.webhookSecret, payload, Math.floor(Date.now() / 1000) - 301)
      })
    ).rejects.toMatchObject({
      name: "StripeProviderError",
      code: "invalid_webhook_signature"
    });
  });
});
