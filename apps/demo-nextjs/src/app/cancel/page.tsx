import { StatusPanel } from "@/components/status-panel";

export default function CancelPage() {
  return (
    <StatusPanel
      eyebrow="Checkout dismissed"
      title="Checkout cancelled"
      copy="Nothing was provisioned. This route exists so both providers can redirect back into the same app-level cancellation flow."
      tone="cancel"
    />
  );
}
