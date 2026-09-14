import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { Lock } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { formatPrice } from "../../lib/format";
import { getStripe, stripeKeyConfigured, stripeTestMode } from "../../lib/stripe";

interface Props {
  clientSecret: string;
  total: number;
  /** Runs after Stripe.js reports success; should settle the order server-side and navigate. */
  onConfirmed: () => Promise<void>;
}

// Mirrors the site's tokens (index.css) so the Stripe iframe doesn't look bolted on.
const appearance: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#0f3a40",
    colorText: "#14201f",
    colorDanger: "#b3261e",
    colorBackground: "#ffffff",
    borderRadius: "6px",
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, sans-serif",
  },
};

export default function StripePaymentStep({ clientSecret, total, onConfirmed }: Props) {
  if (!stripeKeyConfigured) {
    return (
      <div role="alert" className="rounded-md border border-clay/30 bg-clay/5 p-4 text-sm text-clay">
        Card payments aren't available right now. The store's Stripe publishable key is missing.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Payment</h2>
        {stripeTestMode && <Badge tone="warning">Test mode — no real charges</Badge>}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate">
        <Lock size={14} aria-hidden /> Your card details go straight to Stripe. This site never sees your card number.
      </p>
      {/* key: a new PaymentIntent (e.g. after changing delivery speed) needs a fresh Elements instance. */}
      <Elements key={clientSecret} stripe={getStripe()} options={{ clientSecret, appearance }}>
        <PaymentForm total={total} onConfirmed={onConfirmed} />
      </Elements>
    </div>
  );
}

function PaymentForm({ total, onConfirmed }: { total: number; onConfirmed: () => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (stripeError) {
      setError(stripeError.message ?? "Your payment didn't go through. Try another card.");
      setBusy(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      try {
        await onConfirmed();
        return; // navigating away; keep the button in its busy state
      } catch (err) {
        setError(err instanceof Error ? err.message : "We couldn't confirm your order. Check Your Orders before trying again.");
      }
    } else {
      setError("Your payment needs another step that didn't complete. Try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 max-w-lg">
      {/* Link is off: its bank and Klarna funding sources would otherwise show
          as extra tabs even though the PaymentIntent is card-only. */}
      <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs", wallets: { link: "never" } }} />
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-clay">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={!stripe || !ready} loading={busy}>
        {busy ? "Processing payment…" : `Pay ${formatPrice(total)}`}
      </Button>
    </form>
  );
}
