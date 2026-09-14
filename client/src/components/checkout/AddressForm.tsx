import { useState, type FormEvent } from "react";
import type { AddressInput } from "../../lib/types";

interface Props {
  onSubmit: (data: AddressInput) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}

const EMPTY: AddressInput = {
  fullName: "",
  phone: "",
  street: "",
  unit: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
};

export default function AddressForm({ onSubmit, onCancel, busy, error }: Props) {
  const [form, setForm] = useState<AddressInput>(EMPTY);

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} className="surface rounded-md p-4 sm:p-5">
      <h3 className="text-lg font-semibold text-ink">Add a new address</h3>
      <p className="mt-1 text-xs text-slate">
        Fields marked <span className="text-clay">*</span> are required.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required />
        <Field label="Phone number" value={form.phone} onChange={(v) => set("phone", v)} required />
        <Field label="Street address" value={form.street} onChange={(v) => set("street", v)} required className="sm:col-span-2" />
        <Field label="Apt, suite, unit (optional)" value={form.unit ?? ""} onChange={(v) => set("unit", v)} />
        <Field label="City" value={form.city} onChange={(v) => set("city", v)} required />
        <Field label="State" value={form.state} onChange={(v) => set("state", v)} required />
        <Field label="ZIP code" value={form.zip} onChange={(v) => set("zip", v)} required />
        <Field label="Country" value={form.country} onChange={(v) => set("country", v)} required />
      </div>

      {error && <p className="mt-3 text-sm text-amazon-red">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-marigold px-4 py-2 text-sm font-semibold text-harbor-dark hover:bg-marigold-dark disabled:opacity-60"
        >
          Use this address
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-line-strong px-4 py-2 text-sm font-semibold text-harbor hover:bg-paper">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="font-medium text-neutral-800">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-clay">
            *
          </span>
        )}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-line-strong px-3 text-sm outline-none focus:border-harbor focus:ring-2 focus:ring-harbor/15"
      />
    </label>
  );
}
