import { useState } from "react";
import { useAddresses, useAddAddress, useRemoveAddress, useSetDefaultAddress } from "../hooks/useAddresses";
import AddressForm from "../components/checkout/AddressForm";
import ErrorState from "../components/ui/ErrorState";
import PageLoader from "../components/ui/PageLoader";

export default function AddressesPage() {
  const { data, isLoading, isError, refetch } = useAddresses();
  const addAddress = useAddAddress();
  const removeAddress = useRemoveAddress();
  const setDefaultAddress = useSetDefaultAddress();
  const [showForm, setShowForm] = useState(false);

  const addresses = data?.items ?? [];

  return (
    <div className="page-shell max-w-4xl py-6">
      <p className="eyebrow">Account settings</p>
      <h1 className="page-title mt-1 text-ink">Your Addresses</h1>
      <p className="mt-2 text-sm text-slate">Manage the delivery addresses available during checkout.</p>

      {isLoading ? (
        <PageLoader label="Loading addresses" />
      ) : isError ? (
        <ErrorState message="Couldn't load your addresses." onRetry={() => refetch()} />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a._id} className="surface rounded-md p-5 text-sm">
              <p className="font-medium">
                {a.fullName} {a.isDefault && <span className="ml-1 rounded-full bg-moss/10 px-2 py-0.5 text-xs font-medium text-moss">Default</span>}
              </p>
              <p className="mt-2 text-slate">
                {a.street}
                {a.unit ? `, ${a.unit}` : ""}
                <br />
                {a.city}, {a.state} {a.zip}
                <br />
                {a.country}
              </p>
              <p className="text-slate">{a.phone}</p>
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
            className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-line-strong bg-white text-sm font-semibold text-harbor hover:bg-paper"
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
