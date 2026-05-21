"use client";

import { useState, useTransition, type FormEvent } from "react";

type CheckoutResponse = {
  id: string;
  url: string;
  provider: "dodo" | "stripe";
};

type DemoCheckoutFormProps = {
  disabled?: boolean;
};

async function createCheckout(customerEmail: string): Promise<CheckoutResponse> {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      customerEmail
    })
  });

  const body = (await response.json()) as CheckoutResponse | { error?: string };

  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Failed to create checkout.");
  }

  return body as CheckoutResponse;
}

export function DemoCheckoutForm({ disabled = false }: DemoCheckoutFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const customerEmail = String(formData.get("customerEmail") ?? "").trim();

    if (!customerEmail) {
      setErrorMessage("Enter a customer email to launch checkout.");
      return;
    }

    if (disabled) {
      setErrorMessage("The active billing provider is not runnable in this demo.");
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

      window.location.assign(checkout.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create checkout.");
    }
  }

  return (
    <section className="form-card">
      <h2>Subscription checkout</h2>
      <p>Use one email field and let the server inject the configured billing identifier for the active provider.</p>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="customer-email">Customer email</label>
          <input id="customer-email" name="customerEmail" type="email" autoComplete="email" disabled={disabled} required />
        </div>
        <div className="button-row">
          <button className="button" type="submit" disabled={disabled || isPending}>
            {isPending ? "Starting checkout..." : "Start subscription checkout"}
          </button>
        </div>
        <p className="hint">
          {disabled
            ? "This shared route stays disabled until the active provider is wired into the workspace adapter."
            : "The app route stays the same even when the configured provider changes."}
        </p>
        <p className="feedback" aria-live="polite">
          {errorMessage}
        </p>
      </form>
    </section>
  );
}
