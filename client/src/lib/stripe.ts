import { loadStripe, type Stripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export const stripeKeyConfigured = !!publishableKey && publishableKey.startsWith("pk_") && !publishableKey.includes("REPLACE_ME");

/** True for Stripe test-mode keys, where test card numbers are worth showing. */
export const stripeTestMode = stripeKeyConfigured && publishableKey!.startsWith("pk_test_");

let stripePromise: Promise<Stripe | null> | null = null;

/** Loads Stripe.js only when checkout actually needs it. */
export function getStripe() {
  if (!stripeKeyConfigured) return null;
  stripePromise ??= loadStripe(publishableKey!);
  return stripePromise;
}
