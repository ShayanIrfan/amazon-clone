import { useState } from "react";
import { useAddresses, useAddAddress, useRemoveAddress, useSetDefaultAddress } from "../hooks/useAddresses";
import AddressForm from "../components/checkout/AddressForm";
import ErrorState from "../components/ui/ErrorState";

export default function AddressesPage() {
  const { data, isLoading, isError, refetch } = useAddresses();
  const addAddress = useAddAddress();
  const removeAddress = useRemoveAddress();
  const setDefaultAddress = useSetDefaultAddress();
  const [showForm, setShowForm] = useState(false);

  const addresses = data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h1 className="text-2xl font-medium text-neutral-900">Your Addresses</h1>

      {isLoading ? (
        <div className="p-8 text-center text-neutral-500">Loading…</div>
      ) : isError ? (
        <ErrorState message="Couldn't load your addresses." onRetry={() => refetch()} />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a._id} className="rounded-lg border border-neutral-200 p-4 text-sm">
              <p className="font-medium">
                {a.fullName} {a.isDefault && <span className="text-xs font-normal text-neutral-500">(Default)</span>}
              </p>
              <p className="text-neutral-600">
                {a.street}
                {a.unit ? `, ${a.unit}` : ""}
                <br />
                {a.city}, {a.state} {a.zip}
                <br />
                {a.country}
              </p>
              <p className="text-neutral-600">{a.phone}</p>
              <div className="mt-2 flex gap-3 text-xs">
                {!a.isDefault && (
                  <button type="button" onClick={() => setDefaultAddress.mutate(a._id)} className="text-link hover:underline">
                    Set as default
                  </button>
                )}
                <button type="button" onClick={() => removeAddress.mutate(a._id)} className="text-link hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-link hover:bg-neutral-50"
          >
            + Add a new address
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-4">
          <AddressForm
            busy={addAddress.isPending}
            error={addAddress.error instanceof Error ? addAddress.error.message : null}
            onCancel={() => setShowForm(false)}
            onSubmit={(data) => addAddress.mutate(data, { onSuccess: () => setShowForm(false) })}
          />
        </div>
      )}
    </div>
  );
}
