import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBillingProviderMock } = vi.hoisted(() => ({
  getBillingProviderMock: vi.fn()
}));

vi.mock("../src/lib/billing", () => ({
  getBillingProvider: getBillingProviderMock
}));

import { POST } from "../src/app/api/portal/route";

describe("POST /api/portal", () => {
  beforeEach(() => {
    getBillingProviderMock.mockReset();
  });

  it("returns 400 when customerId is missing", async () => {
    const response = await POST(
      new Request("https://demo.openbilling.dev/api/portal", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "customerId is required."
    });
  });

  it("creates a provider portal link with an origin-derived return URL", async () => {
    const createPortalLink = vi.fn().mockResolvedValue({
      url: "https://customer-portal.dodopayments.com/demo",
      provider: "dodo"
    });

    getBillingProviderMock.mockReturnValue({
      createPortalLink
    });

    const response = await POST(
      new Request("https://demo.openbilling.dev/api/portal", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          customerId: "cus_123"
        })
      })
    );

    expect(createPortalLink).toHaveBeenCalledWith({
      customerId: "cus_123",
      returnUrl: "https://demo.openbilling.dev/pricing/demo"
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://customer-portal.dodopayments.com/demo",
      provider: "dodo"
    });
  });
});
