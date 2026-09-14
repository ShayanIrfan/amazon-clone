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
    <label className="flex items-center gap-2 text-sm font-medium text-ink">
      Quantity
      <select
        value={quantity}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-md border border-line-strong bg-white px-2 outline-none focus:border-harbor"
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
