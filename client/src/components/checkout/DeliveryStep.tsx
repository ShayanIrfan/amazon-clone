import type { DeliverySpeed } from "../../lib/types";
import { formatPrice } from "../../lib/format";
import { estimatedDelivery } from "../../lib/format";

interface Props {
  value: DeliverySpeed;
  onChange: (speed: DeliverySpeed) => void;
  onContinue: () => void;
}

const OPTIONS: { value: DeliverySpeed; label: string; price: number; days: number }[] = [
  { value: "standard", label: "Standard Shipping", price: 0, days: 5 },
  { value: "expedited", label: "Expedited Shipping", price: 9.99, days: 2 },
];

export default function DeliveryStep({ value, onChange, onContinue }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Delivery speed</h2>
      <div className="mt-3 space-y-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
              value === o.value ? "border-marigold ring-1 ring-marigold" : "border-line"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="delivery"
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="accent-harbor"
              />
              <span>
                <span className="font-medium">{o.label}</span> — arrives by{" "}
                <span className="font-medium">{estimatedDelivery(o.days)}</span>
              </span>
            </span>
            <span className="amount font-medium">{o.price === 0 ? "FREE" : formatPrice(o.price)}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-5 rounded-md bg-marigold px-6 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark"
      >
        Continue to payment
      </button>
    </div>
  );
}
