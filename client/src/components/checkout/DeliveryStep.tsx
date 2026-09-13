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
      <h2 className="text-lg font-bold text-neutral-900">2. Delivery speed</h2>
      <div className="mt-3 space-y-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
              value === o.value ? "border-amazon-orange ring-1 ring-amazon-orange" : "border-neutral-200"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="delivery"
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="accent-amazon-orange"
              />
              <span>
                <span className="font-medium">{o.label}</span> — arrives by{" "}
                <span className="font-medium">{estimatedDelivery(o.days)}</span>
              </span>
            </span>
            <span className="font-medium">{o.price === 0 ? "FREE" : formatPrice(o.price)}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 rounded-full bg-amazon-yellow px-6 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95"
      >
        Continue to payment
      </button>
    </div>
  );
}
