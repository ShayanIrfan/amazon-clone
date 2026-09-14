import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { env, stripeConfigured } from "../config.js";
import { getStripe, webhookConfigured } from "../lib/stripe.js";
import { finalizeStripeOrder } from "../lib/orderFulfillment.js";

export const paymentsRouter = Router();

// Tells the checkout which payment UI to render. Public: it reveals nothing
// beyond "Stripe or the offline mock".
paymentsRouter.get("/config", (_req, res) => {
  res.json({ provider: stripeConfigured ? "stripe" : "mock" });
});

/**
 * Mounted in app.ts with express.raw() BEFORE express.json() and the CSRF
 * middleware: signature verification needs the exact raw bytes, and Stripe's
 * servers can't send our CSRF cookie/header.
 */
export async function stripeWebhook(req: Request, res: Response) {
  if (!webhookConfigured) {
    res.status(503).json({ error: "Stripe webhooks are not configured" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.get("stripe-signature") ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) await finalizeStripeOrder(orderId);
    }
    res.json({ received: true });
  } catch (err) {
    // A 5xx makes Stripe retry the delivery, which is what we want here.
    console.error("[stripe webhook] handling failed", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
}
