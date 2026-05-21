"use client";

import { useState, useTransition, type FormEvent } from "react";

type PortalResponse = {
  url: string;
  provider: "dodo" | "stripe";
};

type DemoPortalFormProps = {
  disabled?: boolean;
};

async function createPortalSession(customerId: string): Promise<PortalResponse> {
  const response = await fetch("/api/portal", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      customerId
    })
  });

  const body = (await response.json()) as PortalResponse | { error?: string };

  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Failed to create billing portal session.");
  }

  return body as PortalResponse;
}

export function DemoPortalForm({ disabled = false }: DemoPortalFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const customerId = String(formData.get("customerId") ?? "").trim();

    if (!customerId) {
      setErrorMessage("Enter a customer ID to open the billing portal.");
      return;
    }

    if (disabled) {
      setErrorMessage("The active billing provider is not runnable in this demo.");
      return;
    }

    setErrorMessage(null);
    startTransition(() => {
      void submitPortal(customerId);
    });
  }

  async function submitPortal(customerId: string) {
    try {
      const portal = await createPortalSession(customerId);

      window.location.assign(portal.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create billing portal session.");
    }
  }

  return (
    <section className="form-card">
      <h2>Customer portal</h2>
      <p>Keep the first pass honest and simple: enter a provider customer ID and reuse the same route for every adapter.</p>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="customer-id">Customer ID</label>
          <input id="customer-id" name="customerId" type="text" autoComplete="off" disabled={disabled} required />
        </div>
        <div className="button-row">
          <button className="button" type="submit" disabled={disabled || isPending}>
            {isPending ? "Opening portal..." : "Open billing portal"}
          </button>
        </div>
        <p className="hint">
          {disabled
            ? "This provider-neutral portal route stays disabled until the active provider is wired in."
            : "This demo stays database-free and auth-free while still exercising the shared billing contract."}
        </p>
        <p className="feedback" aria-live="polite">
          {errorMessage}
        </p>
      </form>
    </section>
  );
}
