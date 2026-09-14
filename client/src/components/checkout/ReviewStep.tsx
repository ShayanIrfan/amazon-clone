import type { ReactNode } from "react";
import type { Address, CardInput, DeliverySpeed } from "../../lib/types";
import { estimatedDelivery } from "../../lib/format";

interface Props {
  address: Address;
  deliverySpeed: DeliverySpeed;
  card: CardInput;
  onEditAddress: () => void;
  onEditDelivery: () => void;
  onEditPayment: () => void;
  onPlaceOrder: () => void;
  busy: boolean;
  error: string | null;
}

const DELIVERY_LABEL: Record<DeliverySpeed, { label: string; days: number }> = {
  standard: { label: "Standard Shipping", days: 5 },
  expedited: { label: "Expedited Shipping", days: 2 },
};

export default function ReviewStep({
  address,
  deliverySpeed,
  card,
  onEditAddress,
  onEditDelivery,
  onEditPayment,
  onPlaceOrder,
  busy,
  error,
}: Props) {
  const last4 = card.number.replace(/\D/g, "").slice(-4);
  const delivery = DELIVERY_LABEL[deliverySpeed];

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Review your order</h2>

      <div className="mt-3 space-y-3 text-sm">
        <SummaryRow title="Delivering to" onEdit={onEditAddress}>
          {address.fullName}, {address.street}
          {address.unit ? `, ${address.unit}` : ""}, {address.city}, {address.state} {address.zip}
        </SummaryRow>
        <SummaryRow title="Delivery speed" onEdit={onEditDelivery}>
          {delivery.label} — arrives by {estimatedDelivery(delivery.days)}
        </SummaryRow>
        <SummaryRow title="Payment method" onEdit={onEditPayment}>
          Card ending in {last4 || "····"}
        </SummaryRow>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-amazon-red">{error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={onPlaceOrder}
        className="mt-5 rounded-md bg-harbor px-6 py-2.5 text-sm font-semibold text-white hover:bg-harbor-dark disabled:opacity-60"
      >
        {busy ? "Placing your order…" : "Place your order"}
      </button>
    </div>
  );
}

function SummaryRow({ title, children, onEdit }: { title: string; children: ReactNode; onEdit: () => void }) {
  return (
    <div className="surface rounded-md p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-800">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs text-link hover:underline">
          Change
        </button>
      </div>
      <p className="mt-1 text-neutral-600">{children}</p>
    </div>
  );
}
