import Link from "next/link";

type StatusPanelProps = {
  eyebrow: string;
  title: string;
  copy: string;
  tone: "success" | "cancel";
};

export function StatusPanel({ eyebrow, title, copy, tone }: StatusPanelProps) {
  return (
    <main className="status-shell">
      <section className={`status-card ${tone}`}>
        <p className="status-accent">{eyebrow}</p>
        <h1 className="status-title">{title}</h1>
        <p className="status-copy">{copy}</p>
        <div className="button-row">
          <Link className="subtle-button" href="/pricing/demo">
            Return to the pricing demo
          </Link>
        </div>
      </section>
    </main>
  );
}
