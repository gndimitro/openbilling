import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import PricingDemoPage from "../src/app/pricing/demo/page";
import SuccessPage from "../src/app/success/page";
import CancelPage from "../src/app/cancel/page";

afterEach(() => {
  cleanup();
});

describe("demo pages", () => {
  it("renders the landing page with an accessible hero headline and native email validation", () => {
    process.env.BILLING_PROVIDER = "dodo";

    render(<PricingDemoPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /switch between stripe and dodo payments without rewriting your billing logic\./i
      })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /buy now/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeDefined();

    const emailInput = screen.getByRole("textbox", { name: /email/i }) as HTMLInputElement;

    expect(emailInput.getAttribute("type")).toBe("email");
    expect(emailInput.form?.hasAttribute("novalidate")).toBe(false);
  });

  it("opens the portal modal when Sign in is clicked", () => {
    process.env.BILLING_PROVIDER = "stripe";

    render(<PricingDemoPage />);

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /sign in to your portal/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /open portal/i })).toBeDefined();
  });

  it("toggles the price when switching to yearly billing", () => {
    process.env.BILLING_PROVIDER = "dodo";

    render(<PricingDemoPage />);

    expect(screen.getByRole("group", { name: /billing cycle/i })).toBeDefined();
    const monthlyButton = screen.getByRole("button", { name: /^monthly$/i });
    const yearlyButton = screen.getByRole("button", { name: /yearly/i });

    expect(monthlyButton.getAttribute("aria-pressed")).toBe("true");
    expect(yearlyButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /buy now — \$49/i })).toBeDefined();

    fireEvent.click(yearlyButton);

    expect(monthlyButton.getAttribute("aria-pressed")).toBe("false");
    expect(yearlyButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /buy now — \$39\/mo/i })).toBeDefined();
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
