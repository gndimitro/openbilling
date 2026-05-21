"use client";

import { useState } from "react";

import { PortalModal } from "./portal-modal";

type SiteHeaderProps = {
  isProviderRunnable: boolean;
};

export function SiteHeader({ isProviderRunnable }: SiteHeaderProps) {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <div className="page row">
          <div className="brand">
            <div className="brand-mark">◐</div>
            <span>Openbilling</span>
          </div>
          <nav className="links">
            <a href="#">Product</a>
            <a href="#pricing">Pricing</a>
            <a href="#">Docs</a>
            <a href="#">Changelog</a>
          </nav>
          <div className="nav-cta">
            <button type="button" className="btn outline" onClick={() => setPortalOpen(true)}>
              Sign in
            </button>
          </div>
        </div>
      </header>
      <PortalModal
        open={portalOpen}
        onClose={() => setPortalOpen(false)}
        disabled={!isProviderRunnable}
      />
    </>
  );
}
