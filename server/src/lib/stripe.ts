import Stripe from "stripe";
import { env, stripeConfigured } from "../config.js";

let client: Stripe | null = null;

/** Lazily created so the mock-payments setup (placeholder keys) never builds a client. */
export function getStripe(): Stripe {
  if (!stripeConfigured) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is a placeholder)");
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, appInfo: { name: "amazon-clone" } });
  return client;
}

export const webhookConfigured = stripeConfigured && !env.STRIPE_WEBHOOK_SECRET.includes("REPLACE_ME");

/** Order totals are stored in dollars; Stripe amounts are integer cents. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
