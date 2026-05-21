import { Provider } from "@openbilling/core";

import { DemoCheckoutForm } from "@/components/demo-checkout-form";
import { DemoPortalForm } from "@/components/demo-portal-form";
import { DEMO_CHECKOUT_MODE, getConfiguredProviderName } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default function PricingDemoPage() {
  const providerName = getConfiguredProviderName();
  const isProviderRunnable =
    providerName === Provider.Dodo || providerName === Provider.Stripe;

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">OpenBilling / Demo App</p>
        <h1 className="display">Portable Billing Demo</h1>
        <p className="lede">
          Switch the configured provider in environment variables and keep the route handlers untouched. The app stays
          centered on shared SaaS workflows while provider-specific identifiers stay behind one helper boundary.
        </p>
        <div className="pill-row">
          <span className="pill">Active provider: {providerName}</span>
          <span className="pill">Demo mode: {DEMO_CHECKOUT_MODE}</span>
          <span className="pill">Routes: checkout, portal, webhook</span>
        </div>
        <div className="route-grid">
          <article className="panel">
            <h2 className="panel-title">What this stage proves</h2>
            <p className="panel-copy">
              The Next.js app routes call the shared OpenBilling contract only once the request reaches the server. The
              same checkout, portal, and webhook routes stay intact while the provider adapter changes underneath them.
            </p>
            <ul className="panel-list">
              <li>`POST /api/checkout` builds one subscription checkout input per provider.</li>
              <li>`POST /api/portal` reuses the same route contract for billing management.</li>
              <li>`POST /api/webhook` verifies raw payloads and logs normalized events.</li>
            </ul>
          </article>
          <article className="panel">
            <h2 className="panel-title">Current provider status</h2>
            <p className="panel-copy">
              {providerName === Provider.Dodo
                ? "Dodo is active and backed by the workspace adapter. Enter a customer email to launch checkout or a customer ID to open the portal."
                : "Stripe is active and backed by the workspace adapter. Enter a customer email to launch checkout or a Stripe customer ID to open the portal."}
            </p>
            <div className="spec-row">
              <span className="spec-pill">Core API: stable</span>
              <span className="spec-pill">Adapter boundary: one helper</span>
              <span className="spec-pill">UI input: minimal</span>
            </div>
          </article>
        </div>
      </section>

      <section className="demo-grid">
        <div className="form-stack">
          <DemoCheckoutForm disabled={!isProviderRunnable} />
          <DemoPortalForm disabled={!isProviderRunnable} />
        </div>
        <article className="form-card">
          <h2>Environment contract</h2>
          <p>
            The demo keeps provider-specific secrets and identifiers server-side. Only the active provider variables are
            required at runtime.
          </p>
          <ul className="panel-list">
            <li>`BILLING_PROVIDER` selects the adapter branch.</li>
            <li>`DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, and `DODO_PRODUCT_ID` power the Dodo path.</li>
            <li>`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` power the Stripe path.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
