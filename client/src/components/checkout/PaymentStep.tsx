import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import type { CardInput } from "../../lib/types";

interface Props {
  onSubmit: (card: CardInput) => void;
  busy: boolean;
}

function formatCardNumber(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function PaymentStep({ onSubmit, busy }: Props) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ number, expiry, cvv, name });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Payment method</h2>
      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
        <Lock size={12} /> This is a demo checkout — no real card is charged.
      </p>
      <div className="mt-3 rounded-md border border-line bg-paper p-3 text-xs text-slate">
        Try <code className="font-mono">4242 4242 4242 4242</code> (approved) or{" "}
        <code className="font-mono">4000 0000 0000 9995</code> (declined). Any future expiry and any CVV.
      </div>

      <form onSubmit={submit} className="mt-3 max-w-sm space-y-3">
        <label className="block text-sm">
          <span className="font-medium text-neutral-800">Card number</span>
          <input
            type="text"
            inputMode="numeric"
            required
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            className="mt-1 h-10 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15"
          />
        </label>
        <div className="flex gap-3">
          <label className="block flex-1 text-sm">
            <span className="font-medium text-neutral-800">Expiration (MM/YY)</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="mt-1 h-10 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15"
            />
          </label>
          <label className="block w-24 text-sm">
            <span className="font-medium text-neutral-800">CVV</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              className="mt-1 h-10 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-neutral-800">Name on card</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-marigold px-6 py-2.5 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60"
        >
          Continue to review
        </button>
      </form>
    </div>
  );
}
