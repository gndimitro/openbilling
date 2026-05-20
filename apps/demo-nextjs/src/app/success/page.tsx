import { StatusPanel } from "@/components/status-panel";

export default function SuccessPage() {
  return (
    <StatusPanel
      eyebrow="Checkout complete"
      title="Subscription started"
      copy="The hosted checkout returned successfully. In the MVP flow, the webhook route is the source of truth for normalized billing state changes."
      tone="success"
    />
  );
}
