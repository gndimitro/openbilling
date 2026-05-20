import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBillingProviderMock, buildDemoCheckoutInputMock } = vi.hoisted(() => ({
  getBillingProviderMock: vi.fn(),
  buildDemoCheckoutInputMock: vi.fn()
}));

vi.mock("../src/lib/billing", () => ({
  getBillingProvider: getBillingProviderMock,
  buildDemoCheckoutInput: buildDemoCheckoutInputMock
}));

import { POST } from "../src/app/api/checkout/route";

describe("POST /api/checkout", () => {
  beforeEach(() => {
    getBillingProviderMock.mockReset();
    buildDemoCheckoutInputMock.mockReset();
  });

  it("returns 400 when customerEmail is missing", async () => {
    const response = await POST(
      new Request("https://demo.openbilling.dev/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "customerEmail is required."
    });
  });

  it("creates a checkout from provider-neutral route logic", async () => {
    const createCheckout = vi.fn().mockResolvedValue({
      id: "checkout_123",
      url: "https://checkout.dodopayments.com/demo",
      provider: "dodo"
    });

    getBillingProviderMock.mockReturnValue({
      createCheckout
    });
    buildDemoCheckoutInputMock.mockReturnValue({
      customerEmail: "demo@example.com",
      productId: "prod_demo",
      successUrl: "https://demo.openbilling.dev/success",
      cancelUrl: "https://demo.openbilling.dev/cancel",
      mode: "subscription"
    });

    const response = await POST(
      new Request("https://demo.openbilling.dev/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          customerEmail: "demo@example.com"
        })
      })
    );

    expect(buildDemoCheckoutInputMock).toHaveBeenCalledWith({
      customerEmail: "demo@example.com",
      origin: "https://demo.openbilling.dev"
    });
    expect(createCheckout).toHaveBeenCalledWith({
      customerEmail: "demo@example.com",
      productId: "prod_demo",
      successUrl: "https://demo.openbilling.dev/success",
      cancelUrl: "https://demo.openbilling.dev/cancel",
      mode: "subscription"
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "checkout_123",
      url: "https://checkout.dodopayments.com/demo",
      provider: "dodo"
    });
  });
});
