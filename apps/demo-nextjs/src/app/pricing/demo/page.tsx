import { Provider } from '@openbilling/core';

import { PricingCard } from '@/components/pricing-card';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export const dynamic = 'force-dynamic';

function resolveProviderRunnable(): boolean {
  switch (process.env.BILLING_PROVIDER) {
    case Provider.Stripe:
    case Provider.Dodo:
      return true;
    default:
      return false;
  }
}

export default function PricingDemoPage() {
  const isProviderRunnable = resolveProviderRunnable();

  return (
    <>
      <SiteHeader isProviderRunnable={isProviderRunnable} />

      <section className="hero">
        <div className="page">
          <div className="eyebrow">
            <span className="dot" />
            <span>v2.4 — Usage-based invoicing is here</span>
          </div>
          <h1 className="display">
            <span className="display-line">Switch between Stripe and Dodo Payments</span>{" "}
            <em className="display-line">without rewriting your billing logic.</em>
          </h1>
          <p className="lede">
            Portable billing infrastructure for modern SaaS.
          </p>

          <div className="logos">
            <div className="logos-label">Trusted by teams at</div>
            <div className="logo-row">
              <span>Northwind</span>
              <span>Hexlabs</span>
              <span>Fieldnote</span>
              <span>Plotline</span>
              <span>Bramble&amp;Co</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="pricing"
        id="pricing"
      >
        <div className="page">
          <div className="pricing-head">
            <h2>One plan. Everything included.</h2>
            <p>No seat limits, no usage cliffs, no surprise invoices.</p>
          </div>
          <PricingCard isProviderRunnable={isProviderRunnable} />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
