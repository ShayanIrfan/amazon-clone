import { useEffect, useState } from "react";

interface Props {
  productId: string;
  stock: number;
  productTitle: string;
  /** Resolves when the new quantity is saved; rejects with the reason it wasn't. */
  onSave: (stock: number) => Promise<unknown>;
}

const LOW_STOCK = 10;

/** A number field inside a table row: saves on blur or Enter, reverts on Escape or a failed save. */
export default function InlineStockEditor({ productId, stock, productTitle, onSave }: Props) {
  const [draft, setDraft] = useState(String(stock));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the server value when it changes underneath us (another edit, an order).
  useEffect(() => setDraft(String(stock)), [stock, productId]);

  async function commit() {
    const value = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(value) || value < 0 || value > 100_000) {
      setError("Enter a whole number from 0 to 100,000");
      return;
    }
    if (value === stock) {
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
    } catch (err) {
      setDraft(String(stock));
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const low = stock < LOW_STOCK;
  return (
    <div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100000}
        step={1}
        value={draft}
        aria-label={`Stock for ${productTitle}`}
        aria-invalid={!!error || undefined}
        aria-busy={saving || undefined}
        disabled={saving}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(String(stock));
            setError(null);
          }
        }}
        className={`amount h-9 w-20 rounded-xl border bg-white px-2 text-right text-sm outline-none focus:border-harbor disabled:opacity-60 ${
          error ? "border-clay" : "border-line-strong"
        } ${low ? "font-semibold text-clay" : "text-ink"}`}
      />
      {error && (
        <p role="alert" className="mt-1 max-w-40 text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
