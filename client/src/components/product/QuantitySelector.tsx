import { Minus, Plus } from "lucide-react";

export default function QuantitySelector({
  quantity,
  max,
  onChange,
}: {
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  const cap = Math.min(max, 10);
  const btn = "flex h-11 w-11 items-center justify-center text-ink transition-colors hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-ink">Quantity</span>
      <div className="flex items-center rounded-full border border-line-strong">
        <button type="button" onClick={() => onChange(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity" className={`${btn} rounded-l-full`}>
          <Minus size={16} aria-hidden />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">
          {quantity}
        </span>
        <button type="button" onClick={() => onChange(Math.min(cap, quantity + 1))} disabled={quantity >= cap} aria-label="Increase quantity" className={`${btn} rounded-r-full`}>
          <Plus size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
