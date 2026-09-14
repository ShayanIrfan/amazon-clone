import { loadStripe, type Stripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

export const stripeKeyConfigured = !!publishableKey && publishableKey.startsWith("pk_") && !publishableKey.includes("REPLACE_ME");

/** True for Stripe test-mode keys, where checkout shows a "Test mode" badge. */
export const stripeTestMode = stripeKeyConfigured && publishableKey!.startsWith("pk_test_");

let stripePromise: Promise<Stripe | null> | null = null;

/** Loads Stripe.js only when checkout actually needs it. */
export function getStripe() {
  if (!stripeKeyConfigured) return null;
  // The testing assistant is the floating "stripe" button Stripe.js adds to
  // pages in test mode; checkout already carries its own "Test mode" badge.
  stripePromise ??= loadStripe(publishableKey!, { developerTools: { assistant: { enabled: false } } });
  return stripePromise;
}
