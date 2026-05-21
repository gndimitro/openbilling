import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import PricingDemoPage from "../src/app/pricing/demo/page";
import SuccessPage from "../src/app/success/page";
import CancelPage from "../src/app/cancel/page";

afterEach(() => {
  cleanup();
});

describe("demo pages", () => {
  it("renders the pricing demo page", () => {
    process.env.BILLING_PROVIDER = "dodo";

    render(<PricingDemoPage />);

    expect(screen.getByRole("heading", { level: 1, name: /portable billing demo/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /start subscription checkout/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /open billing portal/i })).toBeDefined();
  });

  it("renders the Stripe pricing demo page as runnable", () => {
    process.env.BILLING_PROVIDER = "stripe";

    render(<PricingDemoPage />);

    expect(screen.getByText(/active provider: stripe/i)).toBeDefined();

    const checkoutButton = screen.getByRole("button", { name: /start subscription checkout/i });
    const portalButton = screen.getByRole("button", { name: /open billing portal/i });

    expect(checkoutButton.hasAttribute("disabled")).toBe(false);
    expect(portalButton.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText(/stripe is active and backed by the workspace adapter/i)).toBeDefined();
  });

  it("renders the success page", () => {
    render(<SuccessPage />);

    expect(screen.getByRole("heading", { level: 1, name: /subscription started/i })).toBeDefined();
  });

  it("renders the cancel page", () => {
    render(<CancelPage />);

    expect(screen.getByRole("heading", { level: 1, name: /checkout cancelled/i })).toBeDefined();
  });
});
