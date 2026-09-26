import { useState } from "react";
import { useAddresses, useAddAddress, useRemoveAddress, useSetDefaultAddress } from "../hooks/useAddresses";
import AddressForm from "../components/checkout/AddressForm";
import AccountNav from "../components/account/AccountNav";
import PageHeader from "../components/ui/PageHeader";
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
    <div className="page-shell max-w-4xl py-8">
      <PageHeader eyebrow="Account settings" title="Your addresses" description="Manage the delivery addresses available during checkout." />
      <div className="mt-6"><AccountNav /></div>

      {isLoading ? (
        <PageLoader label="Loading addresses" />
      ) : isError ? (
        <ErrorState message="Couldn't load your addresses." onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a._id} className="surface rounded-2xl p-5 text-sm">
              <p className="flex items-center gap-2 font-bold text-ink">
                {a.fullName} {a.isDefault && <span className="rounded-full bg-harbor/10 px-2 py-0.5 text-xs font-semibold text-harbor">Default</span>}
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
              <div className="mt-3 flex gap-3 text-xs font-semibold">
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
          ))}

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-white text-sm font-semibold text-harbor transition-colors hover:bg-paper"
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
