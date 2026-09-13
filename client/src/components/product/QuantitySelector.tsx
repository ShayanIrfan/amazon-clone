export default function QuantitySelector({
  quantity,
  max,
  onChange,
}: {
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  const options = Array.from({ length: Math.min(max, 10) }, (_, i) => i + 1);

  return (
    <label className="flex items-center gap-2 text-sm">
      Qty:
      <select
        value={quantity}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
