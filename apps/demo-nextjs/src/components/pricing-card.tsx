"use client";

import { useState, useTransition, type FormEvent } from "react";

type CheckoutResponse = {
  id: string;
  url: string;
  provider: "dodo" | "stripe";
};

type PricingCardProps = {
  isProviderRunnable: boolean;
};

const MONTHLY_PRICE = 49;
const FEATURES = [
  "Unlimited subscriptions & invoices",
  "Automatic tax calculation in 40+ regions",
  "Smart dunning & retry logic",
  "Usage-based & tiered pricing models",
  "Webhooks, REST & CLI access",
  "Priority email support"
];

async function createCheckout(customerEmail: string): Promise<CheckoutResponse> {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerEmail })
  });

  const body = (await response.json()) as CheckoutResponse | { error?: string };

  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Failed to create checkout.");
  }

  return body as CheckoutResponse;
}

function Check() {
  return (
    <span className="check">
      <svg viewBox="0 0 12 12">
        <path d="M2.5 6.5 L5 9 L9.5 3.5" />
      </svg>
    </span>
  );
}

export function PricingCard({ isProviderRunnable }: PricingCardProps) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const monthly = billing === "monthly";
  const displayPrice = monthly ? MONTHLY_PRICE : Math.round(MONTHLY_PRICE * 0.8);
  const cycleLabel = monthly ? "/ month" : "/ month, billed yearly";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (done || isPending) return;

    const formData = new FormData(event.currentTarget);
    const customerEmail = String(formData.get("customerEmail") ?? "").trim();

    if (!customerEmail) {
      setErrorMessage("Enter your email to start checkout.");
      return;
    }

    if (!isProviderRunnable) {
      setErrorMessage("No billing provider is configured for this demo.");
      return;
    }

    setErrorMessage(null);
    startTransition(() => {
      void submitCheckout(customerEmail);
    });
  }

  async function submitCheckout(customerEmail: string) {
    try {
      const checkout = await createCheckout(customerEmail);
      setDone(true);
      window.location.assign(checkout.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create checkout.");
    }
  }

  const buttonDisabled = isPending || done;

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="tag">Most popular</div>
      <div className="tier-name">Studio plan</div>
      <div className="price">
        <span className="amount">${displayPrice}</span>
        <span className="cycle mono">{cycleLabel}</span>
      </div>
      <p className="price-sub">
        For growing teams. Cancel anytime — no contracts, no setup fees.
      </p>

      <div className="billing-toggle" role="group" aria-label="Billing cycle">
        {(["monthly", "yearly"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={billing === opt}
            onClick={() => setBilling(opt)}
          >
            {opt}
            {opt === "yearly" ? " · save 20%" : ""}
          </button>
        ))}
      </div>

      <hr className="rule" />

      <ul className="features">
        {FEATURES.map((feature) => (
          <li key={feature}>
            <Check />
            {feature}
          </li>
        ))}
      </ul>

      <div className="field">
        <label htmlFor="checkout-customer-email">Email</label>
        <input
          id="checkout-customer-email"
          name="customerEmail"
          type="email"
          autoComplete="email"
          required
          disabled={done}
        />
      </div>

      <button
        type="submit"
        className={`btn primary lg block${done ? " done" : ""}`}
        disabled={buttonDisabled}
      >
        {done ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8.5 L6.5 12 L13 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Redirecting to checkout…
          </>
        ) : isPending ? (
          <>
            <span className="spinner" />
            Processing…
          </>
        ) : (
          <>
            Buy now — ${displayPrice}
            {!monthly && "/mo"}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7 H11 M7.5 3.5 L11 7 L7.5 10.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      <p className={`fine${errorMessage ? " error" : ""}`} aria-live="polite">
        {errorMessage ?? (
          <>
            Secured by <span className="mono">Openbilling Checkout</span> · 14-day money-back guarantee
          </>
        )}
      </p>
    </form>
  );
}
