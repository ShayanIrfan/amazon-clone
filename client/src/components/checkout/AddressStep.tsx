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
    if (addresses.length === 0) setShowForm(true);
  }, [addresses.length]);

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading addresses…</div>;

  return (
    <div>
      <h2 className="text-lg font-bold text-neutral-900">1. Delivery address</h2>

      <div className="mt-3 space-y-2">
        {addresses.map((a: Address) => (
          <label
            key={a._id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              selectedId === a._id ? "border-amazon-orange ring-1 ring-amazon-orange" : "border-neutral-200"
            }`}
          >
            <input
              type="radio"
              name="address"
              checked={selectedId === a._id}
              onChange={() => onSelect(a._id)}
              className="mt-1 accent-amazon-orange"
            />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {a.fullName} {a.isDefault && <span className="text-xs font-normal text-neutral-500">(Default)</span>}
              </p>
              <p className="text-neutral-600">
                {a.street}
                {a.unit ? `, ${a.unit}` : ""}, {a.city}, {a.state} {a.zip}, {a.country}
              </p>
              <p className="text-neutral-600">{a.phone}</p>
              <div className="mt-1 flex gap-3 text-xs">
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefaultAddress.mutate(a._id)}
                    className="text-link hover:underline"
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAddress.mutate(a._id)}
                  className="text-link hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </label>
        ))}
      </div>

      {showForm ? (
        <div className="mt-3">
          <AddressForm
            busy={addAddress.isPending}
            error={addAddress.error instanceof Error ? addAddress.error.message : null}
            onCancel={() => setShowForm(false)}
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
        <button type="button" onClick={() => setShowForm(true)} className="mt-3 text-sm text-link hover:underline">
          + Add a new address
        </button>
      )}

      <button
        type="button"
        disabled={!selectedId}
        onClick={onContinue}
        className="mt-4 rounded-full bg-amazon-yellow px-6 py-1.5 text-sm font-medium text-neutral-900 hover:brightness-95 disabled:opacity-50"
      >
        Use this address
      </button>
    </div>
  );
}
