/**
 * Built-in provider names supported by the portable billing surface.
 *
 * Prefer these constants over string literals so refactors stay type-safe.
 */
export const Provider = {
  /** Stripe provider adapter name. */
  Stripe: "stripe",
  /** Dodo Payments provider adapter name. */
  Dodo: "dodo"
} as const;

/**
 * Union of the provider names declared in {@link Provider}.
 */
export type BillingProviderName = (typeof Provider)[keyof typeof Provider];

/**
 * Portable checkout intent used across providers.
 *
 * Some providers model this explicitly, while others infer it from the product
 * or price being purchased.
 */
export type BillingMode = "payment" | "subscription";

/**
 * Stable normalized subscription event names.
 */
export const Subscription = {
  /** A subscription became active. */
  Active: "subscription.active",
  /** A subscription was cancelled. */
  Cancelled: "subscription.cancelled"
} as const;

/**
 * Stable normalized payment event names.
 */
export const Payment = {
  /** A payment completed successfully. */
  Succeeded: "payment.succeeded"
} as const;

/**
 * Fallback normalized webhook event names.
 */
export const Webhook = {
  /** The provider event is unsupported or cannot be safely normalized yet. */
  Unknown: "unknown"
} as const;

/**
 * Shared input shape for starting a hosted checkout flow.
 */
export interface CreateCheckoutInput {
  /** Existing provider customer identifier to attach the checkout to. */
  customerId?: string;
  /** Customer email used when the provider needs to create or identify a customer. */
  customerEmail?: string;
  /** Product identifier used by product-based adapters. Dodo currently requires this field. */
  productId?: string;
  /** Price identifier used by price-based adapters. Stripe currently requires this field. */
  priceId?: string;
  /** Where the hosted checkout should redirect after a successful purchase. */
  successUrl: string;
  /** Where the hosted checkout should redirect if the buyer cancels. */
  cancelUrl: string;
  /** Whether the checkout is intended for a one-time payment or a subscription. */
  mode: BillingMode;
  /** Optional metadata forwarded to the billing provider when supported. */
  metadata?: Record<string, string>;
}

/**
 * Shared result returned after creating a hosted checkout session.
 */
export interface CheckoutResult {
  /** Provider-specific checkout or session identifier. */
  id: string;
  /** Hosted checkout URL to redirect the user to. */
  url: string;
  /** Provider that created this checkout session. */
  provider: BillingProviderName;
  /** Escape hatch for the raw provider response payload. */
  raw?: unknown;
}

/**
 * Shared input shape for creating a billing portal or customer-management link.
 */
export interface CreatePortalLinkInput {
  /** Provider customer identifier that should gain access to billing management. */
  customerId: string;
  /** Where the portal should send the user when they exit the hosted flow. */
  returnUrl: string;
}

/**
 * Shared result returned after creating a hosted billing portal link.
 */
export interface PortalLinkResult {
  /** Hosted billing management URL. */
  url: string;
  /** Provider that created this portal link. */
  provider: BillingProviderName;
  /** Escape hatch for the raw provider response payload. */
  raw?: unknown;
}

/**
 * Shared input shape for verifying provider webhook deliveries.
 */
export interface VerifyWebhookInput {
  /** Raw request body as received by the application. */
  payload: string | Uint8Array;
  /** Optional direct signature value for providers that verify from a single header. */
  signature?: string;
  /** Optional secret override when the verification secret is chosen per request. */
  secret?: string;
  /** Optional raw headers for providers that require multiple verification headers. */
  headers?: Record<string, string | undefined>;
}

/**
 * Provider-agnostic webhook events returned by provider adapters.
 *
 * Unsupported provider payloads should resolve to {@link Webhook.Unknown}
 * instead of throwing purely because the event is outside the current MVP.
 */
export type NormalizedWebhookEvent =
  | {
      /** Stable subscription activation event name. */
      type: typeof Subscription.Active;
      /** Provider that emitted the event. */
      provider: BillingProviderName;
      /** Provider customer identifier tied to the subscription. */
      customerId: string;
      /** Provider subscription identifier. */
      subscriptionId: string;
      /** Escape hatch for the raw provider payload. */
      raw?: unknown;
    }
  | {
      /** Stable subscription cancellation event name. */
      type: typeof Subscription.Cancelled;
      /** Provider that emitted the event. */
      provider: BillingProviderName;
      /** Provider customer identifier tied to the subscription. */
      customerId: string;
      /** Provider subscription identifier. */
      subscriptionId: string;
      /** Escape hatch for the raw provider payload. */
      raw?: unknown;
    }
  | {
      /** Stable payment success event name. */
      type: typeof Payment.Succeeded;
      /** Provider that emitted the event. */
      provider: BillingProviderName;
      /** Provider customer identifier when the provider includes one. */
      customerId?: string;
      /** Provider payment identifier. */
      paymentId: string;
      /** Escape hatch for the raw provider payload. */
      raw?: unknown;
    }
  | {
      /** Fallback event name for unsupported or partial provider payloads. */
      type: typeof Webhook.Unknown;
      /** Provider that emitted the event. */
      provider: BillingProviderName;
      /** Raw provider payload preserved for custom handling. */
      raw?: unknown;
    };

/**
 * Minimal contract implemented by every billing provider adapter.
 */
export interface BillingProvider {
  /**
   * Starts a hosted checkout flow for a payment or subscription purchase.
   */
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  /**
   * Creates a hosted billing-management link for an existing customer.
   */
  createPortalLink(input: CreatePortalLinkInput): Promise<PortalLinkResult>;
  /**
   * Verifies an incoming webhook request and returns a normalized event.
   */
  verifyWebhook(input: VerifyWebhookInput): Promise<NormalizedWebhookEvent>;
}

/**
 * Typed identity helper for provider adapters.
 *
 * This keeps provider-specific members on the returned adapter instead of
 * collapsing everything down to the shared {@link BillingProvider} contract.
 *
 * @example
 * ```ts
 * const billing = createBilling({
 *   providerName: Provider.Dodo,
 *   async createCheckout() {
 *     // ...
 *   },
 *   async createPortalLink() {
 *     // ...
 *   },
 *   async verifyWebhook() {
 *     // ...
 *   }
 * });
 * ```
 */
export function createBilling<T extends BillingProvider>(provider: T): T {
  return provider;
}
