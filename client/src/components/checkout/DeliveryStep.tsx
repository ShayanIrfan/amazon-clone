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
      <h2 className="text-lg font-bold text-ink">Delivery speed</h2>
      <div className="mt-4 space-y-3">
        {OPTIONS.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 text-sm transition-colors ${
                selected ? "border-harbor bg-mint/50 ring-1 ring-harbor" : "border-line hover:border-line-strong"
              }`}
            >
              <span className="flex items-center gap-3">
                <input type="radio" name="delivery" checked={selected} onChange={() => onChange(o.value)} className="h-4 w-4 shrink-0 accent-harbor" />
                <span>
                  <span className="block font-semibold text-ink">{o.label}</span>
                  <span className="text-slate">Arrives by {estimatedDelivery(o.days)}</span>
                </span>
              </span>
              <span className={`amount shrink-0 font-bold ${o.price === 0 ? "text-moss" : "text-ink"}`}>{o.price === 0 ? "Free" : formatPrice(o.price)}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-5 h-11 rounded-full bg-harbor px-6 text-sm font-semibold text-white transition-colors hover:bg-harbor-dark sm:w-auto"
      >
        Continue to payment
      </button>
    </div>
  );
}
