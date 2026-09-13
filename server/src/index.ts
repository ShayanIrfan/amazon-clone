import { createApp } from "./app.js";
import { connectDB } from "./db.js";
import { env, stripeConfigured } from "./config.js";

await connectDB();

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  console.log(`[api] payments: ${stripeConfigured ? "Stripe test mode" : "mock provider (no Stripe keys set)"}`);
});
