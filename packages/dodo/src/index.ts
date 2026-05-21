import { Webhook as StandardWebhook } from "standardwebhooks";

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

const DEFAULT_BASE_URL = "https://live.dodopayments.com";
const textDecoder = new TextDecoder();

type DodoErrorCode =
  | "unsupported_input"
  | "api_error"
  | "invalid_webhook_headers"
  | "invalid_webhook_signature";

type DodoCheckoutRequest = {
  product_cart: Array<{
    product_id: string;
    quantity: number;
  }>;
  customer_id?: string;
  customer?: {
    email: string;
  };
  return_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
};

type DodoCheckoutResponse = {
  session_id: string;
  checkout_url?: string | null;
};

type DodoPortalResponse = {
  link: string;
};

type DodoWebhookData = {
  payment_id?: string;
  subscription_id?: string;
  customer?: {
    customer_id?: string;
  };
};

type DodoWebhookPayload = {
  type?: string;
  data?: DodoWebhookData;
};

/**
 * Configuration for the Dodo Payments provider adapter.
 *
 * The current Dodo adapter is intentionally narrow and only covers the hosted
 * checkout, customer portal, and webhook flows documented in the root README.
 */
export interface DodoProviderConfig {
  /** Secret API key used for Dodo REST API requests. */
  apiKey: string;
  /** Webhook signing secret used by `standardwebhooks` verification. */
  webhookSecret: string;
  /** Optional API host override. Defaults to Dodo's live API base URL. */
  baseUrl?: string;
}

/**
 * Error raised by the Dodo provider adapter.
 *
 * The `code` field is stable enough for app-level branching, while `status`
 * is included when the failure originated from the Dodo HTTP API.
 */
export class DodoProviderError extends Error {
  /** Provider-specific error classification. */
  readonly code: DodoErrorCode;
  /** HTTP status returned by Dodo when the error came from an API response. */
  readonly status?: number;

  constructor(message: string, code: DodoErrorCode, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "DodoProviderError";
    this.code = code;

    if (status !== undefined) {
      this.status = status;
    }
  }
}

/**
 * Creates a fetch-based Dodo Payments adapter that implements the shared
 * `@openbilling/core` billing contract.
 *
 * The current MVP intentionally supports a narrow Dodo surface:
 * - checkout creation through `POST /checkouts`
 * - customer billing management through customer portal sessions
 * - webhook verification plus normalization for a small set of events
 *
 * Important provider caveats:
 * - Dodo currently requires `productId` for checkout creation
 * - `priceId` alone is not treated as a portable substitute
 * - the Dodo product determines whether a checkout is one-time or recurring
 * - the adapter defaults to `https://live.dodopayments.com`, with `baseUrl`
 *   available for test mode or custom hosts
 *
 * Supported normalized Dodo webhook coverage:
 * - `payment.succeeded`
 * - `subscription.active`
 * - `subscription.cancelled`
 *
 * Unsupported Dodo events resolve to {@link Webhook.Unknown} instead of
 * throwing purely because the event is outside the current MVP.
 *
 * @throws {DodoProviderError} When input is unsupported, webhook verification
 * fails, or the Dodo API returns an error response.
 *
 * @example
 * ```ts
 * const billing = createDodoProvider({
 *   apiKey: "dodo_api_key",
 *   webhookSecret: "whsec_123"
 * });
 *
 * const checkout = await billing.createCheckout({
 *   productId: "prod_123",
 *   customerEmail: "demo@example.com",
 *   successUrl: "https://example.com/success",
 *   cancelUrl: "https://example.com/cancel",
 *   mode: "subscription"
 * });
 * ```
 */
export function createDodoProvider(config: DodoProviderConfig): BillingProvider {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return createBilling({
    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
      const response = await postJson<DodoCheckoutResponse>(
        `${baseUrl}/checkouts`,
        config.apiKey,
        buildCheckoutRequest(input)
      );

      if (!response.checkout_url) {
        throw new DodoProviderError("Dodo checkout session did not include a checkout URL.", "api_error");
      }

      return {
        id: response.session_id,
        url: response.checkout_url,
        provider: Provider.Dodo,
        raw: response
      };
    },

    async createPortalLink(input: CreatePortalLinkInput): Promise<PortalLinkResult> {
      const endpoint = new URL(
        `${baseUrl}/customers/${encodeURIComponent(input.customerId)}/customer-portal/session`
      );
      endpoint.searchParams.set("return_url", input.returnUrl);

      const response = await postJson<DodoPortalResponse>(endpoint.toString(), config.apiKey);

      return {
        url: response.link,
        provider: Provider.Dodo,
        raw: response
      };
    },

    async verifyWebhook(input: VerifyWebhookInput): Promise<NormalizedWebhookEvent> {
      const headers = getRequiredWebhookHeaders(input.headers);
      const secret = input.secret ?? config.webhookSecret;
      const payload = toWebhookPayload(input.payload);

      try {
        const event = new StandardWebhook(secret).verify(payload, headers);

        return normalizeWebhookEvent(event);
      } catch (error) {
        throw new DodoProviderError("Dodo webhook signature verification failed.", "invalid_webhook_signature", undefined, {
          cause: error
        });
      }
    }
  });
}

function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function buildCheckoutRequest(input: CreateCheckoutInput): DodoCheckoutRequest {
  if (!input.productId) {
    throw new DodoProviderError(
      input.priceId
        ? "Dodo checkout sessions currently require a productId instead of a priceId."
        : "Dodo checkout sessions require a productId.",
      "unsupported_input"
    );
  }

  // Dodo determines whether the checkout is one-time or recurring from the product itself.
  const request: DodoCheckoutRequest = {
    product_cart: [
      {
        product_id: input.productId,
        quantity: 1
      }
    ],
    return_url: input.successUrl,
    cancel_url: input.cancelUrl
  };

  if (input.customerId) {
    request.customer_id = input.customerId;
  } else if (input.customerEmail) {
    request.customer = {
      email: input.customerEmail
    };
  }

  if (input.metadata) {
    request.metadata = input.metadata;
  }

  return request;
}

function getRequiredWebhookHeaders(headers?: Record<string, string | undefined>) {
  const webhookId = headers?.["webhook-id"];
  const webhookSignature = headers?.["webhook-signature"];
  const webhookTimestamp = headers?.["webhook-timestamp"];

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    throw new DodoProviderError(
      "Dodo webhook verification requires webhook-id, webhook-signature, and webhook-timestamp headers.",
      "invalid_webhook_headers"
    );
  }

  return {
    "webhook-id": webhookId,
    "webhook-signature": webhookSignature,
    "webhook-timestamp": webhookTimestamp
  };
}

function toWebhookPayload(payload: VerifyWebhookInput["payload"]): string {
  return typeof payload === "string" ? payload : textDecoder.decode(payload);
}

function normalizeWebhookEvent(event: unknown): NormalizedWebhookEvent {
  const payload = event as DodoWebhookPayload;
  const customerId = payload.data?.customer?.customer_id;

  switch (payload.type) {
    case Payment.Succeeded:
      if (!payload.data?.payment_id) {
        break;
      }

      return {
        type: Payment.Succeeded,
        provider: Provider.Dodo,
        paymentId: payload.data.payment_id,
        ...(customerId ? { customerId } : {}),
        raw: event
      };

    case Subscription.Active:
      if (customerId && payload.data?.subscription_id) {
        return {
          type: Subscription.Active,
          provider: Provider.Dodo,
          customerId,
          subscriptionId: payload.data.subscription_id,
          raw: event
        };
      }

      break;

    case Subscription.Cancelled:
      if (customerId && payload.data?.subscription_id) {
        return {
          type: Subscription.Cancelled,
          provider: Provider.Dodo,
          customerId,
          subscriptionId: payload.data.subscription_id,
          raw: event
        };
      }

      break;
  }

  return {
    type: Webhook.Unknown,
    provider: Provider.Dodo,
    raw: event
  };
}

async function postJson<TResponse>(url: string, apiKey: string, body?: unknown): Promise<TResponse> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const requestInit: RequestInit = {
    method: "POST",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  };
  const response = await fetch(url, requestInit);
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

function createApiError(response: Response, responseBody: unknown): DodoProviderError {
  const message =
    getApiErrorMessage(responseBody) ??
    `Dodo API request failed with status ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`;

  return new DodoProviderError(message, "api_error", response.status);
}

function getApiErrorMessage(responseBody: unknown): string | undefined {
  if (!responseBody || typeof responseBody !== "object") {
    return undefined;
  }

  if ("message" in responseBody && typeof responseBody.message === "string") {
    return responseBody.message;
  }

  if ("error" in responseBody && typeof responseBody.error === "string") {
    return responseBody.error;
  }

  return undefined;
}
