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
    <form onSubmit={submit} className="rounded-lg border border-neutral-200 p-4">
      <h3 className="font-bold text-neutral-900">Add a new address</h3>
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
          className="rounded-full bg-amazon-yellow px-4 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-60"
        >
          Use this address
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50">
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
      <span className="font-medium text-neutral-800">{label}</span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 focus:border-amazon-orange focus:ring-1 focus:ring-amazon-orange focus:outline-none"
      />
    </label>
  );
}
