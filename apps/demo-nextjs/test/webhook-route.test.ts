import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBillingProviderMock } = vi.hoisted(() => ({
  getBillingProviderMock: vi.fn()
}));

vi.mock("../src/lib/billing", () => ({
  getBillingProvider: getBillingProviderMock
}));

import { POST } from "../src/app/api/webhook/route";

describe("POST /api/webhook", () => {
  beforeEach(() => {
    getBillingProviderMock.mockReset();
  });

  it("passes the raw payload and headers to the provider verifier", async () => {
    const verifyWebhook = vi.fn().mockResolvedValue({
      type: "payment.succeeded",
      provider: "dodo",
      paymentId: "pay_123"
    });
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    getBillingProviderMock.mockReturnValue({
      verifyWebhook
    });

    const response = await POST(
      new Request("https://demo.openbilling.dev/api/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "webhook-id": "evt_123",
          "webhook-signature": "sig_123",
          "webhook-timestamp": "1747742400"
        },
        body: JSON.stringify({
          type: "payment.succeeded"
        })
      })
    );

    expect(verifyWebhook).toHaveBeenCalledWith({
      payload: "{\"type\":\"payment.succeeded\"}",
      headers: {
        "content-type": "application/json",
        "webhook-id": "evt_123",
        "webhook-signature": "sig_123",
        "webhook-timestamp": "1747742400"
      }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true
    });

    consoleLogSpy.mockRestore();
  });

  it("acknowledges normalized unknown events", async () => {
    getBillingProviderMock.mockReturnValue({
      verifyWebhook: vi.fn().mockResolvedValue({
        type: "unknown",
        provider: "dodo"
      })
    });

    const response = await POST(
      new Request("https://demo.openbilling.dev/api/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "webhook-id": "evt_456",
          "webhook-signature": "sig_456",
          "webhook-timestamp": "1747742401"
        },
        body: JSON.stringify({
          type: "provider.event.unknown"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true
    });
  });
});
