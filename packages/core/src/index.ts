export const Provider = {
  Stripe: "stripe",
  Dodo: "dodo"
} as const;

export type BillingProviderName = (typeof Provider)[keyof typeof Provider];

export type BillingMode = "payment" | "subscription";

export const Subscription = {
  Active: "subscription.active",
  Cancelled: "subscription.cancelled"
} as const;

export const Payment = {
  Succeeded: "payment.succeeded"
} as const;

export const Webhook = {
  Unknown: "unknown"
} as const;

export interface CreateCheckoutInput {
  customerId?: string;
  customerEmail?: string;
  productId?: string;
  priceId?: string;
  successUrl: string;
  cancelUrl: string;
  mode: BillingMode;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  id: string;
  url: string;
  provider: BillingProviderName;
  raw?: unknown;
}

export interface CreatePortalLinkInput {
  customerId: string;
  returnUrl: string;
}

export interface PortalLinkResult {
  url: string;
  provider: BillingProviderName;
  raw?: unknown;
}

export interface VerifyWebhookInput {
  payload: string | Uint8Array;
  signature: string;
  secret: string;
}

export type NormalizedWebhookEvent =
  | {
      type: typeof Subscription.Active;
      provider: BillingProviderName;
      customerId: string;
      subscriptionId: string;
      raw?: unknown;
    }
  | {
      type: typeof Subscription.Cancelled;
      provider: BillingProviderName;
      customerId: string;
      subscriptionId: string;
      raw?: unknown;
    }
  | {
      type: typeof Payment.Succeeded;
      provider: BillingProviderName;
      customerId?: string;
      paymentId: string;
      raw?: unknown;
    }
  | {
      type: typeof Webhook.Unknown;
      provider: BillingProviderName;
      raw?: unknown;
    };

export interface BillingProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  createPortalLink(input: CreatePortalLinkInput): Promise<PortalLinkResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<NormalizedWebhookEvent>;
}

export function createBilling<T extends BillingProvider>(provider: T): T {
  return provider;
}
