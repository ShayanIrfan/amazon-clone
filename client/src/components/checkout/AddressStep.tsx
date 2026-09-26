import { useEffect, useState } from "react";
import type { Address } from "../../lib/types";
import { useAddresses, useAddAddress, useRemoveAddress, useSetDefaultAddress } from "../../hooks/useAddresses";
import AddressForm from "./AddressForm";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
}

export default function AddressStep({ selectedId, onSelect, onContinue }: Props) {
  const { data, isLoading } = useAddresses();
  const addAddress = useAddAddress();
  const removeAddress = useRemoveAddress();
  const setDefaultAddress = useSetDefaultAddress();
  const [showForm, setShowForm] = useState(false);

  const addresses = data?.items ?? [];

  // Default-select the account's default address once the list loads, so a
  // returning shopper with one address on file doesn't have to click anything.
  useEffect(() => {
    if (!selectedId && addresses.length) {
      onSelect((addresses.find((a) => a.isDefault) ?? addresses[0])._id);
    }
  }, [addresses, selectedId, onSelect]);

  useEffect(() => {
    setShowForm(addresses.length === 0);
  }, [addresses.length]);

  if (isLoading) return <div className="py-8 text-center text-sm text-slate">Loading addresses…</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-ink">Delivery address</h2>

      <div className="mt-4 space-y-3">
        {addresses.map((a: Address) => {
          const selected = selectedId === a._id;
          return (
            <label
              key={a._id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                selected ? "border-harbor bg-mint/50 ring-1 ring-harbor" : "border-line hover:border-line-strong"
              }`}
            >
              <input type="radio" name="address" checked={selected} onChange={() => onSelect(a._id)} className="mt-1 h-4 w-4 shrink-0 accent-harbor" />
              <div className="flex-1 text-sm">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {a.fullName}
                  {a.isDefault && <span className="rounded-full bg-harbor/10 px-2 py-0.5 text-xs font-semibold text-harbor">Default</span>}
                </p>
                <p className="mt-1 text-slate">
                  {a.street}
                  {a.unit ? `, ${a.unit}` : ""}, {a.city}, {a.state} {a.zip}, {a.country}
                </p>
                <p className="text-slate">{a.phone}</p>
                <div className="mt-2 flex gap-3 text-xs font-semibold">
                  {!a.isDefault && (
                    <button type="button" onClick={() => setDefaultAddress.mutate(a._id)} className="text-harbor hover:underline">
                      Set as default
                    </button>
                  )}
                  <button type="button" onClick={() => removeAddress.mutate(a._id)} className="text-slate hover:text-clay">
                    Remove
                  </button>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {showForm ? (
        <div className="mt-4">
          <AddressForm
            busy={addAddress.isPending}
            error={addAddress.error instanceof Error ? addAddress.error.message : null}
            onCancel={() => addresses.length > 0 && setShowForm(false)}
            onSubmit={(data) =>
              addAddress.mutate(data, {
                onSuccess: (res) => {
                  setShowForm(false);
                  const newest = res.items.at(-1);
                  if (newest) onSelect(newest._id);
                },
              })
            }
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong py-3.5 text-sm font-semibold text-harbor transition-colors hover:bg-paper"
          >
            + Add a new address
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={onContinue}
            className="mt-5 h-11 w-full rounded-full bg-harbor px-6 text-sm font-semibold text-white transition-colors hover:bg-harbor-dark disabled:opacity-50 sm:w-auto"
          >
            Continue to delivery
          </button>
        </>
      )}
    </div>
  );
}
