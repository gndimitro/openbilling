"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";

type PortalResponse = {
  url: string;
  provider: "dodo" | "stripe";
};

type PortalModalProps = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
};

async function createPortalSession(customerId: string): Promise<PortalResponse> {
  const response = await fetch("/api/portal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerId })
  });

  const body = (await response.json()) as PortalResponse | { error?: string };

  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Failed to open billing portal.");
  }

  return body as PortalResponse;
}

export function PortalModal({ open, onClose, disabled = false }: PortalModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    inputRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const customerId = String(formData.get("customerId") ?? "").trim();

    if (!customerId) {
      setErrorMessage("Enter your customer ID to open the portal.");
      return;
    }

    if (disabled) {
      setErrorMessage("No billing provider is configured for this demo.");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to open billing portal.");
    }
  }

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-modal-title"
      >
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 3 L11 11 M11 3 L3 11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 id="portal-modal-title">Sign in to your portal</h2>
        <p className="sub">
          Enter your customer ID to manage your subscription, invoices and payment methods.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="portal-customer-id">Customer ID</label>
            <input
              id="portal-customer-id"
              name="customerId"
              type="text"
              autoComplete="off"
              spellCheck={false}
              ref={inputRef}
              required
            />
          </div>
          <button type="submit" className="btn primary lg block" disabled={isPending}>
            {isPending ? (
              <>
                <span className="spinner" />
                Opening portal…
              </>
            ) : (
              <>
                Open portal
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
                Reuses the shared <span className="mono">/api/portal</span> route across providers.
              </>
            )}
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
}
