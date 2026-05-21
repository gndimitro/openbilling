import {
  Payment,
  Provider,
  Subscription,
  Webhook,
  createBilling,
  type BillingProvider,
  type CheckoutResult,
  type CreateCheckoutInput,
  type CreatePortalLinkInput,
  type NormalizedWebhookEvent,
  type PortalLinkResult,
  type VerifyWebhookInput
} from "@openbilling/core";

const STRIPE_API_BASE_URL = "https://api.stripe.com";
const STRIPE_API_VERSION = "2026-04-22.dahlia";
const WEBHOOK_TOLERANCE_SECONDS = 300;
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

type StripeErrorCode = "unsupported_input" | "api_error" | "invalid_webhook_signature";

type StripeCheckoutResponse = {
  id?: string;
  url?: string | null;
};

type StripePortalResponse = {
  id?: string;
  url?: string | null;
};

type StripeApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type StripeEventObject = Record<string, unknown>;

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: StripeEventObject;
  };
};

/**
 * Configuration for the Stripe provider adapter.
 */
export interface StripeProviderConfig {
  /** Restricted or secret API key used for Stripe REST API requests. */
  apiKey: string;
  /** Webhook signing secret used to verify Stripe webhook deliveries. */
  webhookSecret: string;
}

/**
 * Error raised by the Stripe provider adapter.
 */
export class StripeProviderError extends Error {
  /** Stable provider-specific error classification. */
  readonly code: StripeErrorCode;
  /** HTTP status returned by Stripe when the error came from an API response. */
  readonly status?: number;

  constructor(message: string, code: StripeErrorCode, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "StripeProviderError";
    this.code = code;

    if (status !== undefined) {
      this.status = status;
    }
  }
}

/**
 * Creates a fetch-based Stripe adapter that implements the shared
 * `@openbilling/core` billing contract.
 */
export function createStripeProvider(config: StripeProviderConfig): BillingProvider {
  return createBilling({
    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
      const priceId = input.priceId;

      if (!priceId) {
        throw new StripeProviderError(
          input.productId
            ? "Stripe checkout sessions currently require a priceId instead of a productId."
            : "Stripe checkout sessions require a priceId.",
          "unsupported_input"
        );
      }

      const response = await postForm<StripeCheckoutResponse>(
        "/v1/checkout/sessions",
        config.apiKey,
        buildCheckoutForm(input, priceId)
      );

      if (!response.id || !response.url) {
        throw new StripeProviderError("Stripe checkout session did not include both an id and a URL.", "api_error");
      }

      return {
        id: response.id,
        url: response.url,
        provider: Provider.Stripe,
        raw: response
      };
    },

    async createPortalLink(input: CreatePortalLinkInput): Promise<PortalLinkResult> {
      const response = await postForm<StripePortalResponse>(
        "/v1/billing_portal/sessions",
        config.apiKey,
        buildPortalForm(input)
      );

      if (!response.url) {
        throw new StripeProviderError("Stripe billing portal session did not include a URL.", "api_error");
      }

      return {
        url: response.url,
        provider: Provider.Stripe,
        raw: response
      };
    },

    async verifyWebhook(input: VerifyWebhookInput): Promise<NormalizedWebhookEvent> {
      const payload = toWebhookPayload(input.payload);
      const signature = getSignature(input);
      const secret = input.secret ?? config.webhookSecret;
      const parsedHeader = parseSignatureHeader(signature);

      assertTimestampIsFresh(parsedHeader.timestamp);

      const expectedSignature = await createWebhookSignature(secret, `${parsedHeader.timestamp}.${payload}`);
      const hasMatchingSignature = parsedHeader.signatures.some((candidate) =>
        timingSafeEqual(candidate, expectedSignature)
      );

      if (!hasMatchingSignature) {
        throw new StripeProviderError("Stripe webhook signature verification failed.", "invalid_webhook_signature");
      }

      const event = parseWebhookEvent(payload);

      return normalizeWebhookEvent(event);
    }
  });
}

function buildCheckoutForm(input: CreateCheckoutInput, priceId: string): URLSearchParams {
  const params = new URLSearchParams();

  params.set("mode", input.mode);
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");

  if (input.customerId) {
    params.set("customer", input.customerId);
  } else if (input.customerEmail) {
    params.set("customer_email", input.customerEmail);
  }

  if (input.metadata) {
    for (const [key, value] of Object.entries(input.metadata)) {
      params.set(`metadata[${key}]`, value);
    }
  }

  return params;
}

function buildPortalForm(input: CreatePortalLinkInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("customer", input.customerId);
  params.set("return_url", input.returnUrl);
  return params;
}

async function postForm<TResponse>(path: string, apiKey: string, body: URLSearchParams): Promise<TResponse> {
  const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": STRIPE_API_VERSION
    },
    body: body.toString()
  });
  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw createApiError(response, responseBody);
  }

  return responseBody as TResponse;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function createApiError(response: Response, responseBody: unknown): StripeProviderError {
  const message =
    getApiErrorMessage(responseBody) ??
    `Stripe API request failed with status ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`;

  return new StripeProviderError(message, "api_error", response.status);
}

function getApiErrorMessage(responseBody: unknown): string | undefined {
  if (!responseBody || typeof responseBody !== "object") {
    return undefined;
  }

  return (responseBody as StripeApiErrorResponse).error?.message;
}

function toWebhookPayload(payload: VerifyWebhookInput["payload"]): string {
  return typeof payload === "string" ? payload : textDecoder.decode(payload);
}

function getSignature(input: VerifyWebhookInput): string {
  if (input.signature) {
    return input.signature;
  }

  const headerEntry = Object.entries(input.headers ?? {}).find(([key]) => key.toLowerCase() === "stripe-signature");

  if (headerEntry?.[1]) {
    return headerEntry[1];
  }

  throw new StripeProviderError("Stripe webhook verification requires a Stripe-Signature header.", "invalid_webhook_signature");
}

function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } {
  let timestamp: number | undefined;
  const signatures: string[] = [];

  for (const entry of header.split(",")) {
    const [rawKey, rawValue] = entry.split("=", 2);
    const key = rawKey?.trim();
    const value = rawValue?.trim();

    if (!key || !value) {
      continue;
    }

    if (key === "t") {
      const parsedTimestamp = Number(value);

      if (Number.isSafeInteger(parsedTimestamp)) {
        timestamp = parsedTimestamp;
      }
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === undefined || signatures.length === 0) {
    throw new StripeProviderError("Stripe-Signature header is malformed.", "invalid_webhook_signature");
  }

  return {
    timestamp,
    signatures
  };
}

function assertTimestampIsFresh(timestamp: number): void {
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new StripeProviderError("Stripe webhook signature timestamp is outside the accepted tolerance window.", "invalid_webhook_signature");
  }
}

async function createWebhookSignature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));

  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

function parseWebhookEvent(payload: string): StripeWebhookEvent {
  try {
    return JSON.parse(payload) as StripeWebhookEvent;
  } catch (error) {
    throw new StripeProviderError("Stripe webhook payload was not valid JSON.", "invalid_webhook_signature", undefined, {
      cause: error
    });
  }
}

function normalizeWebhookEvent(event: StripeWebhookEvent): NormalizedWebhookEvent {
  const object = event.data?.object;
  const customerId = getString(object?.customer);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      if (getString(object?.status) === "active") {
        const subscriptionId = getString(object?.id);

        if (customerId && subscriptionId) {
          return {
            type: Subscription.Active,
            provider: Provider.Stripe,
            customerId,
            subscriptionId,
            raw: event
          };
        }
      }

      break;

    case "customer.subscription.deleted": {
      const subscriptionId = getString(object?.id);

      if (customerId && subscriptionId) {
        return {
          type: Subscription.Cancelled,
          provider: Provider.Stripe,
          customerId,
          subscriptionId,
          raw: event
        };
      }

      break;
    }

    case "checkout.session.completed": {
      const paymentId = getString(object?.payment_intent);

      if (paymentId) {
        return {
          type: Payment.Succeeded,
          provider: Provider.Stripe,
          ...(customerId ? { customerId } : {}),
          paymentId,
          raw: event
        };
      }

      break;
    }

    case "payment_intent.succeeded": {
      const paymentId = getString(object?.id);

      if (paymentId) {
        return {
          type: Payment.Succeeded,
          provider: Provider.Stripe,
          ...(customerId ? { customerId } : {}),
          paymentId,
          raw: event
        };
      }

      break;
    }
  }

  return {
    type: Webhook.Unknown,
    provider: Provider.Stripe,
    raw: event
  };
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
