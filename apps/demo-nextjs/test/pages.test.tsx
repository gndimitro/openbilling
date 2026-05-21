import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import PricingDemoPage from "../src/app/pricing/demo/page";
import SuccessPage from "../src/app/success/page";
import CancelPage from "../src/app/cancel/page";

afterEach(() => {
  cleanup();
});

describe("demo pages", () => {
  it("renders the landing page", () => {
    process.env.BILLING_PROVIDER = "dodo";

    render(<PricingDemoPage />);

    expect(screen.getByRole("heading", { level: 1, name: /billing infrastructure/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /buy now/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeDefined();
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

    expect(screen.getByRole("button", { name: /buy now — \$49/i })).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: /yearly/i }));

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
